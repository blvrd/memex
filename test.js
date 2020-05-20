global.assert = require("assert");
global.td = require("testdouble");
const browserEnv = require("browser-env");
const recording = require("./recording");
browserEnv();

// test("Backlink generation from Document -> Document", (t) => {
//   // assert.equal(this.recordingOne.generateNewBackLinkPayload(this.recordingTwo)., );
// });

// test("Backlink generation from Document -> Todo");
// test("Backlink generation from Todo -> Document");

module.exports = {
  beforeEach: () => {
    this.recordingOne = new Recording({
      app_url:
        "https://3.basecamp.com/4329389/buckets/14475433/documents/12345",
      content:
        '<div>Some content about Javascript. With a reference to <a href="https://3.basecamp.com/4329389/buckets/14475433/documents/54321">[[Ruby]]</a></div>',
      created_at: "2020-05-07T01:10:20.084Z",
      id: 12345,
      key: "Javascript",
      title: "Javascript",
      type: "Document",
      url:
        "https://3.basecampapi.com/4329389/buckets/14475433/documents/12345.json",
      value:
        '<a href="https://3.basecamp.com/4329389/buckets/14475433/documents/12345">[[Javascript]]</a>',
    });

    this.recordingTwo = new Recording({
      app_url:
        "https://3.basecamp.com/4329389/buckets/14475433/documents/54321",
      content:
        '<div>Some content about Ruby</div><br><br>Mentioned in:<br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/12345">[[Javascript]] ↩</a>',
      created_at: "2020-05-07T01:10:20.084Z",
      id: 54321,
      key: "Ruby",
      title: "Ruby",
      type: "Document",
      url:
        "https://3.basecampapi.com/4329389/buckets/14475433/documents/54321.json",
      value:
        '<a href="https://3.basecamp.com/4329389/buckets/14475433/documents/54321">[[Ruby]]</a>',
    });

    this.recordingThree = new Recording({
      app_url: "https://3.basecamp.com/4329389/buckets/14475433/documents/6789",
      content: "Learn Ruby",
      description: "Here's the description!",
      created_at: "2020-05-07T01:10:20.084Z",
      id: 6789,
      key: "Learn Ruby",
      type: "Todo",
      url:
        "https://3.basecampapi.com/4329389/buckets/14475433/documents/6789.json",
      value:
        '<a href="https://3.basecamp.com/4329389/buckets/14475433/documents/6789">[[Learn Ruby]]</a>',
    });
  },
  "getting a recording's backlink string": () => {
    assert.equal(
      this.recordingOne.backLinkString,
      '<a href="https://3.basecamp.com/4329389/buckets/14475433/documents/12345">[[Javascript]] ↩</a>'
    );
  },
  "checking if a recording contains another recording's backlink": () => {
    assert.equal(
      this.recordingOne.containsBackLink(this.recordingTwo.backLinkString),
      false
    );
    assert.equal(
      this.recordingTwo.containsBackLink(this.recordingOne.backLinkString),
      true
    );
  },
  "checking if a recording contains any backlinks": () => {
    assert.equal(this.recordingOne.containsAnyBackLinks(), false);
    assert.equal(this.recordingTwo.containsAnyBackLinks(), true);
  },
  "getting a recording's backlink field name": () => {
    assert.equal(this.recordingOne.backLinkFieldName, "content");
    assert.equal(this.recordingThree.backLinkFieldName, "description");
  },
  "creating backlinks": () => {
    const contentOne = this.recordingOne.backLinkString;
    const contentTwo = this.recordingTwo.backLinkString;
    const contentThree = this.recordingThree.backLinkString;

    const payloadOne = this.recordingTwo.createBackLink(contentOne).payload;
    const payloadTwo = this.recordingOne.createBackLink(contentTwo).payload;
    const payloadThree = this.recordingTwo.createBackLink(contentThree).payload;

    assert.equal(
      payloadOne.content,
      '<div>Some content about Ruby</div><br><br>Mentioned in:<br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/12345">[[Javascript]] ↩</a>'
    );
    assert.equal(
      payloadTwo.content,
      '<div>Some content about Javascript. With a reference to <a href="https://3.basecamp.com/4329389/buckets/14475433/documents/54321">[[Ruby]]</a></div><br><br>Mentioned in:<br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/54321">[[Ruby]] ↩</a>'
    );
    assert.equal(
      payloadThree.content,
      '<div>Some content about Ruby</div><br><br>Mentioned in:<br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/12345">[[Javascript]] ↩</a><br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/6789">[[Learn Ruby]] ↩</a>'
    );
  },
  "deleting a lone backlink": () => {
    let payload = this.recordingTwo.deleteBackLink(
      this.recordingOne.backLinkString
    ).payload.content;

    assert.equal(payload, "<div>Some content about Ruby</div>");
  },
  "deleting multiple backlinks": () => {
    const recording = this.recordingTwo.createBackLink(
      this.recordingThree.backLinkString
    );

    recording.basecampRecording.content = recording.payload.content;

    assert.equal(
      recording.deleteBackLink(this.recordingThree.backLinkString).payload
        .content,
      '<div>Some content about Ruby</div><br><br>Mentioned in:<br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/12345">[[Javascript]] ↩</a>'
    );
  },
};
