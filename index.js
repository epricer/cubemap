var employeesDocument = null;
var mapDocument = null;
var quotesDocument = null;
var quoteTimer = null;
var foundStructure = null;
var flipCookie = getCookie("flip");
var highLightedColor = "#bfc566";
var PADDING_BOTTOM = 0;
var employeeModel;
var structures;
var mapModel;

flip = ((flipCookie === "") || (flipCookie === null) || (flipCookie == "true")) ? true : false;


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

    var left = (getWindowWidth() - getZoomWidth()) * xPosition;
    var top = (getWindowHeight() - getZoomHeight()) * yPosition;
    $("#map").css("left", left);
    $("#map").css("top", top);
    /*$("#map").css("transition", ".5s");
    $("#map").css("transition-delay", ".02s");*/
}

function getScale() {
    return 1.3;
}

function getWindowWidth() {
    return $(window).width();
}

function getWindowHeight() {
    return $(window).height();
}

function getZoomWidth() {
    return getWindowWidth() * getScale();
}

function getZoomHeight() {
    return getWindowHeight() * getScale();
}


function cacheBust(url) {
    return url + "?d=" + new Date().getTime();
}


function drawMap() {
    var mapElement = getMap();
    mapElement.innerHTML = "";
    var mapWidth = mapModel.width;
    var mapHeight = mapModel.height;
    drawStructures(mapModel.structures.cubes, mapWidth, mapHeight, flip, "cube");
    drawStructures(mapModel.structures.meetingrooms, mapWidth, mapHeight, flip, "meetingrooms");
    drawStructures(mapModel.structures.stairs, mapWidth, mapHeight, flip, "stairs");
    drawStructures(mapModel.structures.utilities, mapWidth, mapHeight, flip, "utilities");
    drawStructures(mapModel.structures.offices, mapWidth, mapHeight, flip, "offices");
    drawStructures(mapModel.structures.voids, mapWidth, mapHeight, flip, "voids");
    drawStructures(mapModel.structures.facilities, mapWidth, mapHeight, flip, "facilities");
    drawStructures(mapModel.structures.restrooms, mapWidth, mapHeight, flip, "restrooms");
}

function init() {
    $("#map").css("transform", "scale(" + getScale() + "," + getScale() + ")");

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


function drawStructures(structures, mapWidth, mapHeight, flip, type) {
    var xScale = getXScale(mapWidth, mapHeight);
    var yScale = getYScale(mapWidth, mapHeight);
    for (var i = 0; i < structures.length; i++) {
        var structureWidget = document.createElement("div");
        structureWidget.className = type;
        structureWidget.type = type;
        structureWidget.style.width = structures[i].width * xScale;
        structureWidget.style.height = structures[i].height * yScale;
        structureWidget.setAttribute("originalWidth", structures[i].width * xScale);
        structureWidget.setAttribute("originalHeight", structures[i].height * xScale);
        structureWidget.innerHTML = structures[i].name;
        structureWidget.id = structures[i].name;

        if (type == "cube") {
            var employee = getEmployeeByStructure(structures[i].name);
            structureWidget.onclick = editStructure;
            structureWidget.style.cursor = "hand";
            if (employee !== null) {
                var nameComponents = employee.name.split(" ");
                structureWidget.innerHTML = nameComponents.join("<br />");
            }
        }
        structureWidget.id = structures[i].name;
        var x;
        var y;
        if (flip) {
            x = (mapWidth - structures[i].x - structures[i].width) * xScale;
            y = (mapHeight - structures[i].y - structures[i].height) * yScale;
        } else {
            x = structures[i].x * xScale;
            y = structures[i].y * yScale;
        }
        structureWidget.style.left = x;
        structureWidget.style.top = y;
        getMap().appendChild(structureWidget);
    }
}

function editStructure(e) {
    var target = (e) ? e.target : window.event.srcElement;
    if (target.type == "cube") {
        showModifyDialog(target.id);
    }
}

function getXScale(mapWidth, mapHeight) {
    return getCanvasWidth(mapWidth, mapHeight) / mapWidth;
}

function getYScale(mapWidth, mapHeight) {
    return getCanvasHeight(mapWidth, mapHeight) / mapHeight;
}

function getCanvasWidth(mapWidth, mapHeight) {
    var maxWidth = document.body.clientWidth;
    var maxHeight = document.body.clientHeight;
    return Math.min(maxWidth, (mapWidth / mapHeight) * maxHeight);
}

function getCanvasHeight(mapWidth, mapHeight) {
    var maxWidth = document.body.clientWidth;
    var maxHeight = document.body.clientHeight - PADDING_BOTTOM;
    return Math.min(maxHeight, (mapHeight / mapWidth) * maxWidth);
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
    req = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
    if (req) {
        req.open("GET", cacheBust(url), false);
        isIe() ? req.send() : req.send(null);
        return req.responseXML;
    }
}


function getMap() {
    return document.getElementById("map");
}


function getEmployees() {
    return selectNodes(getEmployeesDocument(), "/employees")[0];
}

function getEmployeesDocument() {
    if (employeesDocument == null) employeesDocument = loadXMLDoc("employees.xml");
    return employeesDocument;
}

function getMapDocument() {
    if (mapDocument == null) mapDocument = loadXMLDoc("Map.xml");
    return mapDocument;
}

function getQuote() {
    var quotesNodes = getQuotes();
    var i = Math.round(Math.random() * (quotesNodes.length - 1));
    return (isIe()) ? quotesNodes[i].text : quotesNodes[i].textContent;
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
    document.getElementById("bubble").style.display = "block";
    document.getElementById("quote").style.display = "block";
    document.getElementById("quote").innerHTML = getQuote();
    window.setTimeout(hideQuote, 3000);
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

function isIe() {
    return (document.all) ? true : false;
}

function showModifyDialog(structureName) {
    var employee = getEmployeeByStructure(structureName);
    var employeeName = (employee === null) ? "" : employee.name;

    var map = document.getElementById("map").style.opacity = 0.2;
    var dialog = document.getElementById("modification");
    var lookup = document.getElementById("lookup");
    $("#location").val(structureName);
    $("#EmpName").val(employeeName);
    $("#EmpName").data("oldvalue", employeeName);
    dialog.style.display = "block";
}

function closeModification() {
    var map = document.getElementById("map").style.opacity = 1;
    var dialog = document.getElementById("modification");
    dialog.style.display = "none";
}

function deleteEmployee() {
    var name = trimWhitespace($("#EmpName").val());

    if (name === "")
        alert("You must select a name to delete");
    else {
        if (confirm("Are you sure you want to delete this employee?")) {
            $.post("/delete?name=" + name)
                .done(function(data) {
                    closeModification();
                    init();
                });
        }
    }

    $.post("/setlocation", JSON.stringify({ "name": employeeName, "structure": newLocation, "previousname": $("#EmpName").data("oldvalue") }))
        .done(function(data) {
            closeModification();
            init();
        });
}

function commitModification() {

    var employeeName = trimWhitespace($("#EmpName").val());
    var newLocation = trimWhitespace($("#location").val());
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

function refreshMap() {
    employeesDocument = null;
    mapDocument = null;
    drawMap();
}

function getExpiryDate(noDays) {
    var UTCstring;
    Today = new Date();
    nomilli = Date.parse(Today);
    Today.setTime(nomilli + noDays * 24 * 60 * 60 * 1000);
    UTCstring = Today.toUTCString();
    return UTCstring;
}

function getCookie(cookieName) {
    var cookiestring = "" + document.cookie;
    var index1 = cookiestring.indexOf(cookieName);
    if (index1 == -1 || cookieName == "") return "";
    var index2 = cookiestring.indexOf(';', index1);
    if (index2 == -1) index2 = cookiestring.length;
    return unescape(cookiestring.substring(index1 + cookieName.length + 1, index2));
}

function setCookie(name, value, duration) {
    cookiestring = name + "=" + escape(value) + ";EXPIRES=" + getExpiryDate(duration);
    document.cookie = cookiestring;
    if (!getCookie(name)) {
        return false;
    } else {
        return true;
    }
}

function flipMap() {
    flip = !flip;
    setCookie("flip", flip, 10000);
    drawMap();
}

function trimWhitespace(stringToTrim) {
    return stringToTrim.replace(/^\s+/g, '').replace(/\s+$/g, '');
}