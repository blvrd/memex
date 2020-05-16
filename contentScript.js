const store = new window.Store(browser.storage.local);

document.addEventListener("slipbox-links-created", function (e) {
  browser.runtime.sendMessage({
    message: "linksCreated",
    newConnections: e.detail.newConnections,
  });
});

document.addEventListener("slipbox-tribute-attached", function () {
  browser.runtime.sendMessage({ message: "init" });
  store.get(["items", "browserType"]).then((data) => {
    console.log(data);
    if (data.browserType === "firefox") {
      window.wrappedJSObject.recordings = cloneInto(data.items, window);
      window.wrappedJSObject.browserType = cloneInto(data.browserType, window);
    } else {
      window.recordings = data.items;
    }

    const fetchEvent = new CustomEvent("slipbox-data-fetched", {
      bubbles: true,
      detail: { data },
    });

    document.dispatchEvent(fetchEvent);
  });
});

document.addEventListener("slipbox-recording-title-changed", function (e) {
  browser.runtime.sendMessage({
    message: "recordingTitleChanged",
    recordingID: e.detail.recordingID,
    newTitle: e.detail.newTitle,
  });
});

document.addEventListener("slipbox-forward-links-deleted", function (e) {
  browser.runtime.sendMessage({
    message: "linksDeleted",
    deletedConnections: e.detail.deletedConnections,
  });
});

document.addEventListener("slipbox-create-new-document", function (e) {
  (async () => {
    const { browserType } = await store.get("browserType");
    browser.runtime
      .sendMessage({
        message: "createNewDocument",
        title: e.detail.title,
      })
      .then(({ recording }) => {
        if (browserType == "firefox") {
          window.wrappedJSObject.newlyCreatedRecording = cloneInto(
            recording,
            window
          );
        }

        document.dispatchEvent(
          new CustomEvent("slipbox-document-created", {
            bubbles: true,
            detail: { recording },
          })
        );
      });
  })();
});

function main() {
  window.newConnections = [];
  window.recordingTitleChanged = false;
  window.recordingTitleChangedParam = null;
  window.forwardLinks = new Map();
  window.overridingTributeCollection = false;
  window.overriddenTributeCollection = [];

  function clearPageData() {
    window.newConnections = [];
    window.recordingTitleChanged = false;
    window.recordingTitleChangedParam = null;
    window.forwardLinks = new Map();
    window.overridingTributeCollection = false;
    window.overriddenTributeCollection = [];
  }

  function handleFormSubmit(e) {
    const currentForwardLinks = new Map();
    findForwardLinks(
      e.target.closest("form").querySelector("trix-editor")
    ).forEach((link) => {
      const forwardLinkRecordingID = getRecordingIDFromURL(
        window.location.href.replace("/edit", "")
      );

      const backLinkRecordingID = getRecordingIDFromURL(link.href);

      currentForwardLinks.set(
        generateConnectionID(forwardLinkRecordingID, backLinkRecordingID),
        link
      );
    });

    const deletedConnections = Array.from(window.forwardLinks.entries())
      .filter((arr) => !currentForwardLinks.has(arr[0]))
      .map((arr) => {
        const forwardLinkRecordingID = getRecordingIDFromURL(
          window.location.href.replace("/edit", "")
        );

        const backLinkRecordingID = getRecordingIDFromURL(arr[1].href);

        return {
          forwardLinkRecordingID,
          backLinkRecordingID,
        };
      });

    if (deletedConnections.length > 0) {
      const linkDeletedEvent = new CustomEvent(
        "slipbox-forward-links-deleted",
        {
          bubbles: true,
          detail: {
            deletedConnections: deletedConnections,
          },
        }
      );

      document.dispatchEvent(linkDeletedEvent);
      window.deletedConnections = null;
    }

    if (window.newConnections.length > 0) {
      const linkEvent = new CustomEvent("slipbox-links-created", {
        bubbles: true,
        detail: {
          newConnections: window.newConnections,
        },
      });

      document.dispatchEvent(linkEvent);
      window.newConnections = [];
    }

    if (window.recordingTitleChanged) {
      const recordingID = getRecordingIDFromURL(
        window.location.href.replace("/edit", "")
      );

      const input = document.getElementsByName(
        window.recordingTitleChangedParam
      )[0];

      const titleChangedEvent = new CustomEvent(
        "slipbox-recording-title-changed",
        {
          bubbles: true,
          detail: {
            recordingID: recordingID,
            newTitle: input.value,
          },
        }
      );

      document.dispatchEvent(titleChangedEvent);
    }
  }

  document.addEventListener("turbolinks:load", function () {
    clearPageData();
  });

  document.addEventListener("keydown", (e) => {
    if (!(e.keyCode == 13 && e.metaKey)) return;

    handleFormSubmit(e);
  });

  document.addEventListener("click", (e) => {
    if (e.target.tagName !== "input" && e.target.type !== "submit") {
      return;
    }

    handleFormSubmit(e);
  });

  document.addEventListener("change", function (e) {
    if (
      e.target.name !== "todo[content]" &&
      e.target.name !== "document[title]"
    ) {
      return;
    }

    window.recordingTitleChanged = true;
    window.recordingTitleChangedParam = e.target.name;
  });

  document.addEventListener("keydown", function (e) {
    if (e.target.tagName !== "TRIX-EDITOR") {
      return;
    }

    switch (e.key) {
      case "Alt":
        handleAlt();
        break;
      case "Backspace":
        handleBackspace(e);
        break;
    }
  });

  function handleAlt() {
    if (!window.tribute?.isActive) {
      return;
    }

    if (window.overridingTributeCollection) {
      restoreTributeCollection();
    } else {
      overrideTributeCollection();
    }
  }

  function handleBackspace(e) {
    // e.preventDefault();
    // const editor = e.target.editor;
    // const currentPosition = editor.getSelectedRange()[0];
    // const docString = editor.getDocument().toString();
    // let string = [
    //   editor.composition.document.getCharacterAtPosition(currentPosition),
    //   editor.composition.document.getCharacterAtPosition(currentPosition - 1),
    //   editor.composition.document.getCharacterAtPosition(currentPosition - 2),
    // ];
    //
    // if (window.browserType === "firefox") {
    //   string.push(
    //     editor.composition.document.getCharacterAtPosition(currentPosition - 2)
    //   );
    // }
    //
    // string = string.join("").trim();
    //
    // console.log(string);
    // if (string.match("]]")) {
    //   const deleteTo = docString.lastIndexOf("[[", currentPosition);
    //   editor.setSelectedRange([deleteTo, currentPosition]);
    // }
    //
    // editor.deleteInDirection("backward");
  }

  function overrideTributeCollection() {
    window.overriddenTributeCollection =
      window.tribute.current.collection.values;
    window.tribute.current.collection.values = [];
    window.tribute.hideMenu();

    window.overridingTributeCollection = true;
  }

  function restoreTributeCollection() {
    window.tribute.current.collection.values =
      window.overriddenTributeCollection;
    window.overriddenTributeCollection = [];
    window.tribute.hideMenu();

    window.overridingTributeCollection = false;
  }

  function htmlToElements(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content.childNodes;
  }

  function attachTribute(element) {
    const editor = element.editor;
    // editor.composition.delegate.inputController.events.keypress = function () {};
    editor.composition.delegate.inputController.events.keydown = function (
      event
    ) {
      let character, context, keyName, keys, modifier;

      if (window.tribute.isActive) {
        return;
      }

      this.resetInputSummary();
      (function () {
        let i, len, ref, ref1;
        if (!this.isComposing()) {
          this.inputSummary.didInput = true;
          if ((keyName = Trix.config.keyNames[event.keyCode])) {
            context = this.keys;
            ref = ["ctrl", "alt", "shift", "meta"];
            for (i = 0, len = ref.length; i < len; i++) {
              modifier = ref[i];
              if (!event[modifier + "Key"]) {
                continue;
              }
              if (modifier === "ctrl") {
                modifier = "control";
              }
              context = context != null ? context[modifier] : void 0;
            }
            if ((context != null ? context[keyName] : void 0) != null) {
              this.setInputSummary({
                keyName: keyName,
              });
              Trix.selectionChangeObserver.reset();
              context[keyName].call(this, event);
            }
          }
          if (Trix.keyEventIsKeyboardCommand(event)) {
            if (
              (character = String.fromCharCode(event.keyCode).toLowerCase())
            ) {
              keys = (function () {
                let j, len1, ref1, results;
                ref1 = ["alt", "shift"];
                results = [];
                for (j = 0, len1 = ref1.length; j < len1; j++) {
                  modifier = ref1[j];
                  if (event[modifier + "Key"]) {
                    results.push(modifier);
                  }
                }
                return results;
              })();
              keys.push(character);
              if (
                (ref1 = this.delegate) != null
                  ? ref1.inputControllerDidReceiveKeyboardCommand(keys)
                  : void 0
              ) {
                return event.preventDefault();
              }
            }
          }
        }
      }.call(this));
    };

    window.tribute = new window.Tribute({
      trigger: "[[",
      allowSpaces: true,
      values: [],
      menuItemTemplate: (item) => {
        const dateParts = item.original.created_at.split("T")[0].split("-");
        const formattedDate = new Date(
          dateParts[0],
          dateParts[1] - 1,
          dateParts[2]
        ).toDateString();
        return `<div>${item.string} - <span style="font-size: 0.95rem">${item.original.type} created ${formattedDate}</span></div>`;
      },
      noMatchTemplate: () => {
        return "<li style='color: #35b46f'>Create a new document</li>";
      },
    });

    findForwardLinks(element).map((link) => {
      const forwardLinkRecordingID = getRecordingIDFromURL(
        window.location.href.replace("/edit", "")
      );

      const backLinkRecordingID = getRecordingIDFromURL(link.href);

      window.forwardLinks.set(
        generateConnectionID(forwardLinkRecordingID, backLinkRecordingID),
        link
      );
    });
    window.tribute.attach(element);

    window.tribute.events.shouldDeactivate = function (event) {
      if (!this.tribute.isActive) return false;

      const keys = [
        {
          key: 9,
          value: "TAB",
        },
        {
          key: 8,
          value: "DELETE",
        },
        {
          key: 13,
          value: "ENTER",
        },
        {
          key: 27,
          value: "ESCAPE",
        },
        {
          key: 32,
          value: "SPACE",
        },
        {
          key: 38,
          value: "UP",
        },
        {
          key: 40,
          value: "DOWN",
        },
        {
          key: 18,
          value: "ALT",
        },
      ];

      if (this.tribute.current.mentionText.length === 0) {
        let eventKeyPressed = false;
        keys.forEach((o) => {
          if (event.keyCode === o.key) eventKeyPressed = true;
        });

        return !eventKeyPressed;
      }

      return false;
    };

    window.tribute.range.replaceTriggerText = function (
      text,
      requireLeadingSpace,
      hasTrailingSpace,
      originalEvent,
      item
    ) {
      let info = this.getTriggerInfo(
        true,
        hasTrailingSpace,
        requireLeadingSpace,
        this.tribute.allowSpaces,
        this.tribute.autocompleteMode
      );

      if (info !== undefined) {
        let context = this.tribute.current;
        let replaceEvent = new CustomEvent("tribute-replaced", {
          detail: {
            item: item,
            instance: context,
            context: info,
            event: originalEvent,
          },
        });

        const linkTag = htmlToElements(text)[0].firstElementChild;
        let title;
        if (!linkTag) {
          title = text.replace("[[", "");
        } else {
          text = linkTag.outerHTML;
        }

        createNewDocumentIfNecessary(title, item).then((recording) => {
          if (recording.hasOwnProperty("original")) {
            item = recording.original;
            text = recording.original.value;
          } else {
            item = recording;
            text = recording.value;
          }
          if (!this.isContentEditable(context.element)) {
            let myField = this.tribute.current.element;
            let textSuffix =
              typeof this.tribute.replaceTextSuffix == "string"
                ? this.tribute.replaceTextSuffix
                : " ";
            text += textSuffix;
            let startPos = info.mentionPosition;
            let endPos =
              info.mentionPosition +
              info.mentionText.length +
              textSuffix.length;
            if (!this.tribute.autocompleteMode) {
              endPos += info.mentionTriggerChar.length - 1;
            }
            myField.value =
              myField.value.substring(0, startPos) +
              text +
              myField.value.substring(endPos, myField.value.length);
            myField.selectionStart = startPos + text.length;
            myField.selectionEnd = startPos + text.length;
          } else {
            // add a space to the end of the pasted text
            let textSuffix =
              typeof this.tribute.replaceTextSuffix == "string"
                ? this.tribute.replaceTextSuffix
                : "\xA0";
            text += textSuffix;
            let endPos = info.mentionPosition + info.mentionText.length;
            if (!this.tribute.autocompleteMode) {
              endPos += info.mentionTriggerChar.length;
            }
            this.pasteHtml(text, info.mentionPosition, endPos);

            const forwardLinkRecordingID = getRecordingIDFromURL(
              window.location.href.replace("/edit", "")
            );

            const backLinkRecordingID = getRecordingIDFromURL(item.app_url);

            const connectionID = generateConnectionID(
              forwardLinkRecordingID,
              backLinkRecordingID
            );

            if (!window.forwardLinks.has(connectionID)) {
              window.newConnections.push({
                forwardLinkRecordingID: forwardLinkRecordingID,
                backLinkRecordingID: backLinkRecordingID,
              });
            }
          }
          context.element.dispatchEvent(
            new CustomEvent("input", { bubbles: true })
          );
          context.element.dispatchEvent(replaceEvent);
        });
      }
    };

    const attachedEvent = new CustomEvent("slipbox-tribute-attached", {
      bubbles: true,
      detail: {
        tribute: element.id,
      },
    });

    element.dispatchEvent(attachedEvent);
  }

  function findForwardLinks(element) {
    return (
      Array.from(element.querySelectorAll("a")).filter((link) => {
        return link.text.includes("]]") && !link.text.includes("↩");
      }) || []
    );
  }

  function generateConnectionID(forwardLinkRecordingID, backLinkRecordingID) {
    return forwardLinkRecordingID.toString() + backLinkRecordingID.toString();
  }

  function getRecordingIDFromURL(url) {
    return parseInt(url.split("/").pop());
  }

  function createNewDocumentIfNecessary(title, item) {
    const newDocNecessary = title && !item;

    if (newDocNecessary) {
      document.dispatchEvent(
        new CustomEvent("slipbox-create-new-document", {
          bubbles: true,
          detail: { title: title },
        })
      );

      return new Promise((resolve) => {
        document.addEventListener("slipbox-document-created", function (e) {
          if (window.browserType == "firefox") {
            resolve(window.newlyCreatedRecording);
          } else {
            resolve(e.detail.recording);
          }

          if (window.overridingTributeCollection) {
            restoreTributeCollection();
          }
        });
      });
    } else {
      return new Promise((resolve) => {
        resolve(item);
      });
    }
  }

  document.addEventListener("trix-initialize", function (e) {
    attachTribute(e.target);
  });

  document.addEventListener("slipbox-data-fetched", function (e) {
    if (window.browserType == "firefox") {
      window.tribute.append(0, window.recordings);
    } else {
      window.tribute.append(0, e.detail.data.items);
    }
  });
}

const tributeScript = document.createElement("script");
tributeScript.src = "https://unpkg.com/tributejs@5.1.3/dist/tribute.js";

document.head.appendChild(tributeScript);

const tributeCSS = document.createElement("link");
tributeCSS.href = "https://unpkg.com/tributejs@5.1.3/dist/tribute.css";
tributeCSS.rel = "stylesheet";

document.head.appendChild(tributeCSS);

const script = document.createElement("script");
script.appendChild(document.createTextNode("(" + main + ")();"));
(document.body || document.head || document.documentElement).appendChild(
  script
);
