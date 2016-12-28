var employeesDocument = null;
var mapDocument = null;
var quotesDocument = null;
var quoteTimer = null;
var foundStructure = null;
var PADDING_BOTTOM = 0;
var employeeModel;
var structures;
var mapModel;


function Structure(description, type, x, y, width, height) {
    this.description = description;
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}

function trackCursor(mouseEvent) {
    var xPosition = mouseEvent.x / getWindowWidth();
    var yPosition = mouseEvent.y / getWindowHeight();

    var zoomWidth = getZoomWidth();
    var zoomHeight = getZoomHeight();
    var left = (zoomWidth !== null) ? (getWindowWidth() - zoomWidth) * xPosition : 0;
    var top = (zoomHeight !== null) ? (getWindowHeight() - zoomHeight) * yPosition : 0;
    $("#map").css("left", left);
    $("#map").css("top", top);
}

function getZoom() {
    return 1.3;
}

function getWindowWidth() {
    return $(window).width();
}

function getWindowHeight() {
    return $(window).height();
}

function getZoomWidth() {
    if (mapModel.width * getAutoScale(mapModel.width, mapModel.height) * getZoom() < getWindowWidth()) return null;
    return getWindowWidth() * getZoom();
}

function getZoomHeight() {
    if (mapModel.height * getAutoScale(mapModel.width, mapModel.height) * getZoom() < getWindowHeight()) return null;
    return getWindowHeight() * getZoom();
}

function cacheBust(url) {
    return url + "?d=" + new Date().getTime();
}

function drawMap() {
    var mapElement = getMap();
    mapElement.innerHTML = "";
    var mapWidth = mapModel.width;
    var mapHeight = mapModel.height;

    for (var property in mapModel.structures) {
        drawStructures(mapModel.structures[property], mapWidth, mapHeight, property);
    }
}


function init() {
    $("#map").css("transform", "scale(" + getZoom() + "," + getZoom() + ")");

    $.when(
        jQuery.getJSON("/employees.json", function(data) {
            employeeModel = data;
        }),
        jQuery.getJSON("/map.json", function(data) {
            mapModel = data;
        })
    ).then(function() {
        drawMap();
    });
}


function drawStructures(structures, mapWidth, mapHeight, type) {
    var scale = getAutoScale(mapWidth, mapHeight);
    for (var i = 0; i < structures.length; i++) {
        var structureWidget = document.createElement("div");
        structureWidget.className = type;
        structureWidget.type = type;
        structureWidget.style.width = structures[i].width * scale;
        structureWidget.style.height = structures[i].height * scale;
        structureWidget.innerHTML = structures[i].name;
        structureWidget.id = structures[i].name;

        if (type == "cubes") {
            var employee = getEmployeeByStructure(structures[i].name);
            structureWidget.onclick = editStructure;
            structureWidget.style.cursor = "hand";
            if (employee !== null) {
                var nameComponents = employee.name.split(" ");
                structureWidget.innerHTML = nameComponents.join("<br />");
            }
        }
        structureWidget.id = structures[i].name;
        structureWidget.style.left = (mapWidth - structures[i].x - structures[i].width) * scale;
        structureWidget.style.top = (mapHeight - structures[i].y - structures[i].height) * scale;
        getMap().appendChild(structureWidget);
    }
}

function editStructure(e) {
    var target = (e) ? e.target : window.event.srcElement;
    if (target.type == "cubes") {
        showModifyDialog(target.id);
    }
}

function getAutoScale(mapWidth, mapHeight) {
    // calculate a scaling factor that maximizes the map in the available screen
    var scaleX = $(window).width() / mapWidth;
    var scaleY = $(window).height() / mapHeight;
    return Math.floor(Math.min(scaleX, scaleY));
}

function selectNodes(node, xpathExpression) {
    if (document.all) {
        return node.selectNodes(xpathExpression);
    } else {
        var xpe = new XPathEvaluator();
        var nsResolver = xpe.createNSResolver(node.ownerDocument == null ? node.documentElement : node.ownerDocument.documentElement);
        var result = xpe.evaluate(xpathExpression, node, nsResolver, 0, null);
        var found = [];
        while (res = result.iterateNext()) found.push(res);
        return found;
    }
}

function loadXMLDoc(url) {
    var req;
    req = new XMLHttpRequest();
    if (req) {
        req.open("GET", cacheBust(url), false);
        req.send(null);
        return req.responseXML;
    }
}


function getMap() {
    return document.getElementById("map");
}


function getQuote() {
    var quotesNodes = getQuotes();
    var i = Math.round(Math.random() * (quotesNodes.length - 1));
    return quotesNodes[i].textContent;
}

function getQuotes() {
    return selectNodes(getQuotesDocument(), "/quotes/quote");
}

function getQuotesDocument() {
    if (quotesDocument === null) quotesDocument = loadXMLDoc("Quotes.xml");
    return quotesDocument;
}

function getEmployeeByStructure(structureName) {

    for (var i = 0; i < employeeModel.length; i++) {
        if (employeeModel[i].structure === structureName) return employeeModel[i];
    }
    return null;
}

function showQuote() {
    hideQuote();
    document.getElementById("bubble").style.display = "block";
    document.getElementById("quote").style.display = "block";
    document.getElementById("quote").innerHTML = getQuote();
    quoteTimer = window.setTimeout(hideQuote, 3000);
}

function hideQuote() {
    window.clearTimeout(quoteTimer);
    document.getElementById("bubble").style.display = "none";
    document.getElementById("quote").style.display = "none";
}

function showModifyDialog(structureName) {
    var employee = getEmployeeByStructure(structureName);
    var employeeName = (employee === null) ? "" : employee.name;

    $("#map").css("opacity", 0.2);
    $("#location").val(structureName);
    $("#EmpName").val(employeeName);
    $("#EmpName").data("oldvalue", employeeName);
    $("#modification").css("display", "block");
}

function closeModification() {
    document.getElementById("map").style.opacity = 1;
    $("#modification").css("display", "none");
}

function deleteEmployee() {
    var name = $("#EmpName").val().trim();

    if (name === "")
        alert("You must select a name to delete");
    else {
        if (confirm("Are you sure you want to delete this employee?")) {
            $.post("/delete?name=" + name)
                .done(function() {
                    closeModification();
                    init();
                });
        }
    }
}

function commitModification() {

    var employeeName = $("#EmpName").val().trim();
    var newLocation = $("#location").val().trim();
    if ((employeeName === "") || (newLocation === "")) {
        alert("You must enter a name (Firstname Lastname) and provide a location (cube number)");
    } else {
        $.post("/setlocation", JSON.stringify({ "name": employeeName, "structure": newLocation, "previousname": $("#EmpName").data("oldvalue") }))
            .done(function(data) {
                closeModification();
                init();
            });
    }
}