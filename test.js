global.assert = require("assert");
global.td = require("testdouble");
const browserEnv = require("browser-env");
const recording = require("./recording");
browserEnv();

const recordingOne = new Recording({
  app_url: "https://3.basecamp.com/4329389/buckets/14475433/documents/12345",
  content:
    "<div>Some content about Javascript. With a reference to <a href=https://3.basecamp.com/4329389/buckets/14475433/documents/54321>[[Ruby]]</a></div>",
  created_at: "2020-05-07T01:10:20.084Z",
  id: 12345,
  key: "Javascript",
  title: "Javascript",
  type: "Document",
  url:
    "https://3.basecampapi.com/4329389/buckets/14475433/documents/12345.json",
  value:
    "<a href=https://3.basecamp.com/4329389/buckets/14475433/documents/12345>[[Javascript]]</a>",
});

const recordingTwo = new Recording({
  app_url: "https://3.basecamp.com/4329389/buckets/14475433/documents/54321",
  content:
    "<div>Some content about Ruby</div><br><br>Mentioned in:<br><a href=https://3.basecamp.com/4329389/buckets/14475433/documents/12345>[[Javascript]] ↩</a>",
  created_at: "2020-05-07T01:10:20.084Z",
  id: 54321,
  key: "Ruby",
  title: "Ruby",
  type: "Document",
  url:
    "https://3.basecampapi.com/4329389/buckets/14475433/documents/54321.json",
  value:
    "<a href=https://3.basecamp.com/4329389/buckets/14475433/documents/54321>[[Ruby]]</a>",
});

const recordingThree = new Recording({
  app_url: "https://3.basecamp.com/4329389/buckets/14475433/documents/6789",
  content: "Learn Ruby",
  description: "Here's the description!",
  created_at: "2020-05-07T01:10:20.084Z",
  id: 6789,
  key: "Learn Ruby",
  type: "Todo",
  url: "https://3.basecampapi.com/4329389/buckets/14475433/documents/6789.json",
  value:
    "<a href=https://3.basecamp.com/4329389/buckets/14475433/documents/6789>[[Learn Ruby]]</a>",
});

// test("Backlink generation from Document -> Document", (t) => {
//   // assert.equal(recordingOne.generateNewBackLinkPayload(recordingTwo)., );
// });

// test("Backlink generation from Document -> Todo");
// test("Backlink generation from Todo -> Document");

module.exports = {
  "getting a recording's backlink string": () => {
    assert.equal(
      recordingOne.backLinkString,
      '<a href="https://3.basecamp.com/4329389/buckets/14475433/documents/12345">[[Javascript]] ↩</a>'
    );
  },
  "checking if a recording contains another recording's backlink": () => {
    assert.equal(recordingOne.containsBackLinkFrom(recordingTwo), false);
    assert.equal(recordingTwo.containsBackLinkFrom(recordingOne), true);
  },
  "checking if a recording contains any backlinks": () => {
    assert.equal(recordingOne.containsAnyBackLinks(), false);
    assert.equal(recordingTwo.containsAnyBackLinks(), true);
  },
  "getting a recording's backlink field name": () => {
    assert.equal(recordingOne.backLinkFieldName, "content");
    assert.equal(recordingThree.backLinkFieldName, "description");
  },
  "generating backlink content to insert": () => {
    const contentOne = recordingOne.generateBackLinkContentToInsertInto(
      recordingTwo
    );
    const contentTwo = recordingTwo.generateBackLinkContentToInsertInto(
      recordingOne
    );
    const contentThree = recordingThree.generateBackLinkContentToInsertInto(
      recordingTwo
    );

    assert.equal(contentOne, "");
    assert.equal(
      contentTwo,
      '<br><br>Mentioned in:<br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/54321">[[Ruby]] ↩</a>'
    );
    assert.equal(
      contentThree,
      '<br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/6789">[[Learn Ruby]] ↩</a>'
    );
  },
  "generating payload for update": () => {
    const contentOne = recordingOne.generateBackLinkContentToInsertInto(
      recordingTwo
    );
    const contentTwo = recordingTwo.generateBackLinkContentToInsertInto(
      recordingOne
    );
    const contentThree = recordingThree.generateBackLinkContentToInsertInto(
      recordingTwo
    );

    const payloadOne = recordingTwo.generatePayloadForUpdate(contentOne);
    const payloadTwo = recordingOne.generatePayloadForUpdate(contentTwo);
    const payloadThree = recordingTwo.generatePayloadForUpdate(contentThree);

    assert.equal(
      payloadOne.content,
      "<div>Some content about Ruby</div><br><br>Mentioned in:<br><a href=https://3.basecamp.com/4329389/buckets/14475433/documents/12345>[[Javascript]] ↩</a>"
    );
    assert.equal(
      payloadTwo.content,
      '<div>Some content about Javascript. With a reference to <a href=https://3.basecamp.com/4329389/buckets/14475433/documents/54321>[[Ruby]]</a></div><br><br>Mentioned in:<br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/54321">[[Ruby]] ↩</a>'
    );
    assert.equal(
      payloadThree.content,
      '<div>Some content about Ruby</div><br><br>Mentioned in:<br><a href=https://3.basecamp.com/4329389/buckets/14475433/documents/12345>[[Javascript]] ↩</a><br><a href="https://3.basecamp.com/4329389/buckets/14475433/documents/6789">[[Learn Ruby]] ↩</a>'
    );
  },
};
