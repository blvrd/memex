class Recording {
  constructor(recording) {
    this.recording = recording;
  }

  generateNewBackLinkPayload(otherRecording) {
    let payload;

    switch (otherRecording.type) {
      case "Document":
        payload = {
          title: otherRecording.title,
          content:
            otherRecording.content + backLinkContent(this, otherRecording),
        };
        break;
      case "Todo":
        payload = {
          content: otherRecording.content,
          description:
            otherRecording.description + backLinkContent(this, otherRecording),
          assignee_ids: otherRecording.assignee_ids,
          completion_subscriber_ids: otherRecording.completion_subscriber_ids,
          notify: otherRecording.notify,
          due_on: otherRecording.due_on,
          starts_on: otherRecording.starts_on,
        };
        break;
    }

    return payload;
  }

  get app_url() {
    return this.recording.app_url;
  }

  get backLinkString() {
    const domLink = this.htmlToElement(this.recording.value);
    domLink.innerHTML = domLink.innerHTML + " &#8617;";
    return domLink.outerHTML;
  }

  containsBackLinkFrom(otherRecording) {
    const domNodes = this.htmlToElements(
      this.recording[this.backLinkFieldName]
    );

    return Array.from(domNodes.querySelectorAll("a")).some((a) => {
      return a.href === otherRecording.app_url && a.innerHTML.includes("↩");
    });
  }

  containsAnyBackLinks() {
    const domNodes = this.htmlToElements(
      this.recording[this.backLinkFieldName]
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
    switch (this.recording.type) {
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
