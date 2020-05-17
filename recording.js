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
    let payload;

    switch (this.basecampRecording.type) {
      case "Document":
        payload = {
          ...this.payload,
          content: this.basecampRecording.content + newBackLink,
        };
        break;
      case "Todo":
        payload = {
          ...this.payload,
          description: this.basecampRecording.description + newBackLink,
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

  containsBackLinkFrom(otherRecording) {
    const domNodes = this.htmlToElements(
      this.basecampRecording[this.backLinkFieldName]
    );

    return Array.from(domNodes.querySelectorAll("a")).some((a) => {
      return a.href === otherRecording.app_url && a.innerHTML.includes("↩");
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

  generateBackLinkContentToInsertInto(otherRecording) {
    if (otherRecording.containsBackLinkFrom(this)) {
      return "";
    } else if (otherRecording.containsAnyBackLinks()) {
      return `<br>${this.backLinkString}`;
    } else {
      return `<br><br>Mentioned in:<br>${this.backLinkString}`;
    }
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
