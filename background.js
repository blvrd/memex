const store = new Store(browser.storage.local);

browser.runtime.onInstalled.addListener(() => {
  setBrowserType();
});

async function setBrowserType() {
  let browserType;

  if (browser.identity.getRedirectURL().includes("allizom")) {
    browserType = "firefox";
  } else {
    browserType = "chrome";
  }

  store.set({ browserType: browserType });
  return browserType;
}

browser.runtime.onMessage.addListener((messageObj) => {
  const { message } = messageObj;

  return (async () => {
    try {
      switch (message) {
        case "needRecordings":
          await populateRecordings();
          console.log("POPULATED RECORDINGS");
          break;
        case "linksCreated":
          await createBackLinks(messageObj.newConnections);
          console.log("CREATED BACKLINKS");
          break;
        case "linksDeleted":
          await deleteBackLinks(messageObj.deletedConnections);
          console.log("DELETED BACKLINKS");
          break;
        case "recordingTitleChanged":
          await updateLinkTitles(messageObj);
          console.log("UPDATED LINK TITLES");
          break;
        case "createNewDocument":
          let newRecording = await createNewDocument(messageObj);
          return { recording: newRecording };
          // await send message back with new recording
          break;
        case "searchRecordings":
          const searchResults = await searchRecordings(messageObj.searchTerm);
          console.log("SEARCH");
          return searchResults;
          break;
      }
    } catch (error) {
      console.error(error);
    }
  })();
});

browser.runtime.onConnect.addListener((request, sender, sendResponse) => {
  return Promise.resolve(browser.identity.getRedirectUrl());
});

async function searchRecordings(searchTerm) {
  const { items } = await store.get("items");

  return items.filter((item) => {
    return item.key.toLowerCase().includes(searchTerm);
  });
}

async function populateRecordings() {
  const accessToken = await getAccessToken();
  console.log(accessToken);
  const account = await getAccount(accessToken);
  const allRecordings = await Promise.all([
    getRecordings(accessToken, account, "Document"),
    getRecordings(accessToken, account, "Todo"),
  ]);
  const project = await getProject(accessToken, account);
  getVault(accessToken, project);

  const formattedRecordings = formatRecordings(allRecordings.flat());

  store.set({
    items: formattedRecordings,
  });

  return formattedRecordings;
}

async function getAccount(accessToken) {
  let response = await fetch(
    "https://launchpad.37signals.com/authorization.json",
    fetchOptions(accessToken)
  );

  let json = await response.json();
  const found = json.accounts.filter((item) => {
    return item.name === "Garrett Martin";
  })[0];

  store.set({ account: found });
  return found;
}

async function getProject(accessToken, account) {
  const response = await fetch(
    `${account.href}/projects.json`,
    fetchOptions(accessToken)
  );
  const projects = await response.json();
  store.set({
    project: projects[0],
  });

  return projects[0];
}

async function getVault(accessToken, project) {
  const vaultURL = project.dock.find((dockItem) => {
    return dockItem.name === "vault";
  }).url;

  const response = await fetch(vaultURL, fetchOptions(accessToken));
  const vault = await response.json();

  store.set({
    vault: vault,
  });
}

function getRecordings(authToken, account, recordingType) {
  const href = account.href;
  const initialRecordingsUrl = `${href}/projects/recordings.json?type=${recordingType}`;

  return new Promise((resolve) => {
    let recordings = [];

    const _fetchRecordings = function (url) {
      getAllRecordings(authToken, url)
        .next()
        .value.then((data) => {
          recordings = recordings.concat(data.recordings);

          if (data.more) {
            _fetchRecordings(data.more);
          } else {
            resolve(recordings);
          }
        });
    };

    _fetchRecordings(initialRecordingsUrl);
  });
}

function parseLinkHeader(s) {
  let output = "";
  const regex = /<([^>]+)>; rel="([^"]+)"/g;

  let m;
  while ((m = regex.exec(s))) {
    const [_, v, k] = m;
    output = v;
  }

  return output;
}

function fetchOptions(authToken, method = "GET", body = null) {
  let formattedBody;
  if (body !== null) {
    formattedBody = JSON.stringify(body);
  }
  return {
    method: method,
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: formattedBody,
  };
}

function formatRecordings(recordings) {
  return recordings.map((recording) => {
    let displayText;

    switch (recording.type) {
      case "Document":
      case "Todo":
        displayText = recording.title;
        break;
    }

    // recording.connection_ids =
    recording.key = displayText;
    recording.value = `<a href="${recording.app_url}">[[${displayText}]]</a>`;

    return recording;
  });
}

function validate(redirectURL) {}

function authorize() {
  const redirectURL = browser.identity.getRedirectURL();
  let clientID;
  // if firefox
  if (redirectURL.includes("chromiumapp")) {
    clientID = "6c2bff799f234888f8cd381a07ea03fd12048554";
  } else {
    clientID = "e43d911a974a368d0da98ee97e1d6bb8d7e735a1";
  }
  let authURL = `https://launchpad.37signals.com/authorization/new?type=user_agent`;
  authURL += `&client_id=${clientID}`;
  authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;

  return browser.identity.launchWebAuthFlow({
    interactive: true,
    url: authURL,
  });
}

function extractAccessToken(redirectURI) {
  let m = redirectURI.match(/[#?](.*)/);
  if (!m || m.length < 1) return null;
  let params = new URLSearchParams(m[1].split("#")[0]);
  return params.get("access_token");
}

async function getAccessToken() {
  const { accessToken } = await store.get("accessToken");

  if (!accessToken) {
    let redirectURI = await authorize();
    const accessToken = extractAccessToken(redirectURI);
    store.set({
      accessToken: accessToken,
    });
    return accessToken;
  } else {
    return accessToken;
  }
}

function* getAllRecordings(authToken, url) {
  // // Loop forever, yielding the results of the ajax call to the caller
  while (true) {
    const payload = { recordings: null, more: null };
    let more;

    yield fetch(url, fetchOptions(authToken))
      .then((response) => {
        more = parseLinkHeader(response.headers.get("Link"));

        if (more) {
          payload.more = more;
        }

        return response.json();
      })
      .then((recordings) => {
        if (recordings && recordings.length > 0) {
          payload.recordings = recordings;
        }

        return new Promise((resolve) => resolve(payload));
      });
  }
}

async function createBackLinks(newConnections) {
  let data = await store.get(["items", "accessToken"]);

  const requests = newConnections.map(
    ({ forwardLinkRecordingID, backLinkRecordingID }) => {
      const authToken = data["accessToken"];
      const forwardLinkRecording = new Recording(
        data.items.filter((item) => {
          return item.id === forwardLinkRecordingID;
        })[0]
      );

      const backLinkRecording = new Recording(
        data.items.filter((item) => {
          return item.id === backLinkRecordingID;
        })[0]
      );

      const body = backLinkRecording.createBackLink(
        forwardLinkRecording.backLinkString
      ).payload;

      return fetch(backLinkRecording.url, fetchOptions(authToken, "PUT", body));
    }
  );

  populateRecordings();
  return Promise.all(requests);
}

function generateNewBackLinkPayload(forwardLinkRecording, backLinkRecording) {
  let payload;

  switch (backLinkRecording.type) {
    case "Document":
      payload = {
        title: backLinkRecording.title,
        content:
          backLinkRecording.content +
          backLinkContent(forwardLinkRecording, backLinkRecording),
      };
      break;
    case "Todo":
      payload = {
        content: backLinkRecording.content,
        description:
          backLinkRecording.description +
          backLinkContent(forwardLinkRecording, backLinkRecording),
        assignee_ids: backLinkRecording.assignee_ids,
        completion_subscriber_ids: backLinkRecording.completion_subscriber_ids,
        notify: backLinkRecording.notify,
        due_on: backLinkRecording.due_on,
        starts_on: backLinkRecording.starts_on,
      };
      break;
  }

  return payload;
}

function backLinkContent(forwardLinkRecording, backLinkRecording) {
  let recordingBacklinkField;
  switch (backLinkRecording.type) {
    case "Document":
      recordingBacklinkField = "content";
      break;
    case "Todo":
      recordingBacklinkField = "description";
      break;
  }

  const linkValue = backLinkString(forwardLinkRecording);

  const alreadyContainsBackLink = backLinkRecording[
    recordingBacklinkField
  ].includes(`[[${forwardLinkRecording.key}]]`);

  if (alreadyContainsBackLink) {
    return "";
  } else if (
    backLinkRecording[recordingBacklinkField].includes("Mentioned in")
  ) {
    return `<br>${linkValue}`;
  } else {
    return `<br><br>Mentioned in:<br>${linkValue}`;
  }
}

function backLinkString(recording) {
  const domLink = htmlToElement(recording.value);
  domLink.innerHTML = domLink.innerHTML + " &#8617;";
  return domLink.outerHTML;
}

async function updateLinkTitles({ recordingID, newTitle }) {
  let data = await store.get(["items", "accessToken"]);
  const authToken = data["accessToken"];
  const recordingThatWasUpdated = data.items.find((recording) => {
    return recording.id === recordingID;
  });

  let updatedTitleField;
  switch (recordingThatWasUpdated.type) {
    case "Document":
      updatedTitleField = "title";
      break;
    case "Todo":
      updatedTitleField = "content";
      break;
  }

  const regex = new RegExp(recordingThatWasUpdated.key, "g");
  const requests = data.items.map((recording) => {
    let recordingBackLinkField;
    switch (recording.type) {
      case "Document":
        recordingBackLinkField = "content";
        break;
      case "Todo":
        recordingBackLinkField = "description";
        break;
    }

    const containsLink = recording[recordingBackLinkField].includes(
      recordingThatWasUpdated.key
    );

    // Nothing to update
    if (!containsLink) {
      return null;
    }

    const newContent = recording[recordingBackLinkField].replace(
      regex,
      newTitle
    );

    recording[recordingBackLinkField] = newContent;

    const body = generateUpdatedLinkPayload(recording);
    return fetch(recording.url, fetchOptions(authToken, "PUT", body));
  });

  return Promise.all(requests.filter((req) => req !== null));
}

async function deleteBackLinks(deletedConnections) {
  let data = await store.get(["items", "accessToken"]);
  const authToken = data["accessToken"];

  const requests = deletedConnections.map(
    ({ forwardLinkRecordingID, backLinkRecordingID }) => {
      const forwardLinkRecording = new Recording(
        data.items.filter((item) => {
          return item.id === forwardLinkRecordingID;
        })[0]
      );

      const backLinkRecording = new Recording(
        data.items.filter((item) => {
          return item.id === backLinkRecordingID;
        })[0]
      );

      const body = backLinkRecording.deleteBackLink(
        forwardLinkRecording.backLinkString
      ).payload;
      return fetch(backLinkRecording.url, fetchOptions(authToken, "PUT", body));
    }
  );

  populateRecordings();

  return Promise.all(requests);
}

function htmlToElement(html) {
  var template = document.createElement("template");
  html = html.trim();
  template.innerHTML = html;
  return template.content.firstChild;
}

function htmlToElements(html) {
  var template = document.createElement("template");
  template.innerHTML = html;
  return template.content.childNodes;
}

function generateUpdatedLinkPayload(recording) {
  let payload;

  switch (recording.type) {
    case "Document":
      payload = {
        title: recording.title,
        content: recording.content,
      };
      break;
    case "Todo":
      payload = {
        content: recording.content,
        description: recording.description,
        assignee_ids: recording.assignee_ids,
        completion_subscriber_ids: recording.completion_subscriber_ids,
        notify: recording.notify,
        due_on: recording.due_on,
        starts_on: recording.starts_on,
      };
      break;
  }

  return payload;
}

async function createNewDocument({ title }) {
  const { vault, accessToken, items } = await store.get([
    "vault",
    "accessToken",
    "items",
  ]);

  const body = {
    title: title,
    content: "<div></div>",
    status: "active",
  };

  const response = await fetch(
    vault.documents_url,
    fetchOptions(accessToken, "POST", body)
  );

  let recording = await response.json();
  recording = formatRecordings([recording])[0];
  items.push(recording);

  await store.set({ items: items });

  return recording;
}
