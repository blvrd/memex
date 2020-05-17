class Recording {
  constructor(basecampRecording) {
    this.basecampRecording = basecampRecording;
    let initialPayload;

    switch (this.basecampRecording.type) {
      case "Document":
        initialPayload = {
          title: this.basecampRecording.title,
          content: this.basecampRecording.content,
        };
        break;
      case "Todo":
        initialPayload = {
          content: this.basecampRecording.content,
          description: this.basecampRecording.description,
          assignee_ids: this.basecampRecording.assignee_ids,
          completion_subscriber_ids: this.basecampRecording
            .completion_subscriber_ids,
          notify: this.basecampRecording.notify,
          due_on: this.basecampRecording.due_on,
          starts_on: this.basecampRecording.starts_on,
        };
        break;
    }

    this.payload = initialPayload;
  }

  createBackLink(newBackLink) {
    let payload, newBackLinkContent;

    if (this.containsBackLink(newBackLink)) {
      newBackLinkContent = "";
    } else if (this.containsAnyBackLinks()) {
      newBackLinkContent = `<br>${newBackLink}`;
    } else {
      newBackLinkContent = `<br><br>Mentioned in:<br>${newBackLink}`;
    }

    switch (this.basecampRecording.type) {
      case "Document":
        payload = {
          ...this.payload,
          content: this.basecampRecording.content + newBackLinkContent,
        };
        break;
      case "Todo":
        payload = {
          ...this.payload,
          description: this.basecampRecording.description + newBackLinkContent,
        };
        break;
    }

    const newRecording = new Recording(this.basecampRecording);
    newRecording.payload = payload;
    return newRecording;
  }

  get app_url() {
    return this.basecampRecording.app_url;
  }

  get url() {
    return this.basecampRecording.url;
  }

  get backLinkString() {
    const domLink = this.htmlToElement(this.basecampRecording.value);
    domLink.innerHTML = domLink.innerHTML + " &#8617;";
    return domLink.outerHTML;
  }

  containsBackLink(backLinkString) {
    const domNodes = this.htmlToElements(
      this.basecampRecording[this.backLinkFieldName]
    );

    const backLinkNode = this.htmlToElement(backLinkString);

    return Array.from(domNodes.querySelectorAll("a")).some((a) => {
      console.log(a.href, backLinkString);
      return a.href === backLinkNode.href && a.innerHTML.includes("↩");
    });
  }

  containsAnyBackLinks() {
    const domNodes = this.htmlToElements(
      this.basecampRecording[this.backLinkFieldName]
    );

    return Array.from(domNodes.querySelectorAll("a")).some((a) => {
      return a.innerHTML.includes("↩");
    });
  }

  get backLinkFieldName() {
    switch (this.basecampRecording.type) {
      case "Document":
        return "content";
      case "Todo":
        return "description";
    }
  }

  htmlToElement(html) {
    var template = document.createElement("template");
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
  }

  htmlToElements(html) {
    var template = document.createElement("template");
    template.innerHTML = html;
    return template.content;
  }
}

if (typeof window !== "undefined") {
  window.Recording = Recording;
} else {
  global.Recording = Recording;
}
