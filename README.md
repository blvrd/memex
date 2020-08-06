# Memex

![screen recording](screen_recording.gif)

Memex is an experiment web extension that automaticall backlinks Basecamp todos and documents. I haven't published the extension for distribution for a few reasons:

1. It stores your Basecamp API refresh token in localstorage. It's unlikely for your localstorage to be compromised, but I'd rather not be responsible for that sensitive data possibly being exposed.
2. It stores all of your documents and todos in localstorage. Again, unlikely to be compromised, but I'm not willing to take that risk on a side-project.
3. In response to my [misunderstanding of content scripts](https://github.com/basecamp/trix/issues/759), I poked some [questionable](https://github.com/garrettqmartin8/memex/blob/master/contentScript.js#L651) [holes](https://github.com/garrettqmartin8/memex/blob/master/contentScript.js#L48) in Firefox's attempt to keep the boundaries between website and extension secure.
