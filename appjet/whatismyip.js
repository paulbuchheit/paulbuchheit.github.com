/* appjet:version 0.1 */

page.setMode("plain");
response.setContentType("text/plain");
response.write(request.clientAddr + "\n");
if (request.path == "/andheaders") {
    for (var h in request.headers)
        response.write(h + ": " + request.headers[h] + "\n")
}

