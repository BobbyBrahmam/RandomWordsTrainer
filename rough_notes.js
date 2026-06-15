function doGet(e) {

  const action = e.parameter.action;
  let response;

  if (action === "getSessionWords") {

    const userId = e.parameter.user_id;

    response = {
      words: getSessionWords(userId)
    };

  } else {
    response = { success:false, error:"Unknown action" };
  }

  const callback = e.parameter.callback;

  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(response) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}