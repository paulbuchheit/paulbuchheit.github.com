/* appjet:version 0.1 */
import('lib-style');
var url = request.params.url;
if (url && url.substring(0, 4) != "http") url = "http://" + url;

page.setTitle("Gzip encoding checker");
print(H2("Gzip encoding checker"));
print(FORM({method:"POST", action:"/"}, "URL to test: ",
    INPUT({type:"text", name:"url", value: url||"", size:60}),
    INPUT({type:"submit", value:"Check"})));


if (url) {
    try {
        res = wget(url, undefined, {complete:true, headers:{"Accept-Encoding": "gzip"}});
        var lh = {}
        for (var h in res.headers) lh[h.toLowerCase()] = res.headers[h];
        var ct = lh["content-type"];
        var ce = lh["content-encoding"];
        var error = null;
        
        if (res.status != 200) {
            error = "Non-HTTP 200 response. Please use a different url"; 
        } else if (ct && ct[0].substring(0, 5) != "text/") {
            error = "Non-text content type (" + ct + "). Please use an html page";
        } else if (!ce || ce[0] != "gzip") {
            error = "BAD: not using gzip encoding";
        }
        print(DIV({style:"font-weight:bold;font-size:14pt;margin:2em 0 2em 0"}, "Result: ",
            error ? SPAN({style:"color:red"}, error)
                  : SPAN({style:"color:green"}, "Good, you're using gzip!")));
        print(H3("Headers:"), res.headers);
    } catch (e) {
        print("Error: " +e);
    }
} 

print(DIV({style:"margin-top:4em;line-height:1.5em"}, "See: ",
  A({href:"http://paulbuchheit.blogspot.com/2009/04/make-your-site-faster-and-cheaper-to.html"},
    "http://paulbuchheit.blogspot.com/2009/04/make-your-site-faster-and-cheaper-to.html"),
  BR(), "Also: ", A({href:"http://appjet.com/app/360617583/source"}, "Source code for this app")));

