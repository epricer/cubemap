var PADDING_RIGHT = 15;
var PADDING_LEFT = 15;
var PADDING_TOP = 70;
var PADDING_BOTTOM = 15;
var employeesDocument = null;
var mapDocument = null;
var quotesDocument = null;
var quoteTimer = null;
var foundStructure = null;
var flipCookie = getCookie("flip");
var highLightedColor = "#bfc566";

flip = ((flipCookie == "") || (flipCookie == null) || (flipCookie == "true")) ? true : false;

function Structure(description, type, x, y, width, height) {
    this.description = description;
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}

function cacheBust(url) {
    return url + "?d=" + new Date().getTime();
}

function fillEmployeeList() {
    try {
        var employeelist = document.getElementById("employeelist");
        document.getElementById("employeelist").innerHTML = '';
        var employees = getEmployees();

        //sort the list by name
        var sortedList = new Array();
        for (var i = 0; i < employees.childNodes.length; i++) {
            if (1 == employees.childNodes[i].nodeType) {
                sortedList.push(employees.childNodes[i].getAttribute("name") + "," + employees.childNodes[i].getAttribute("structurename"));
            }
        }
        sortedList = sortedList.sort();

        //run thru the sorted array and build the options
        var empOption = document.createElement("option");
        empOption.text = "Select an Employee";
        empOption.value = "0";
        employeelist.options.add(empOption);
        for (var i = 0; i < sortedList.length; i++) {
            var splitValue = sortedList[i].split(",");
            empOption = document.createElement("option");
            empOption.text = splitValue[0];
            empOption.value = splitValue[1];
            employeelist.options.add(empOption);
        }
    } catch (e) {
        alert(e);
    }
}

function drawMap() {
    try {
        getMap().innerHTML = "";
        var mapNode = selectNodes(getMapDocument(), "/map")[0];
        var mapWidth = mapNode.getAttribute("width");
        var mapHeight = mapNode.getAttribute("height");
        drawStructures(getStructures(getMapDocument(), "cubes"), mapWidth, mapHeight, flip);
        drawStructures(getStructures(getMapDocument(), "meetingrooms"), mapWidth, mapHeight, flip);
        drawStructures(getStructures(getMapDocument(), "stairs"), mapWidth, mapHeight, flip);
        drawStructures(getStructures(getMapDocument(), "utilities"), mapWidth, mapHeight, flip);
        drawStructures(getStructures(getMapDocument(), "offices"), mapWidth, mapHeight, flip);
        drawStructures(getStructures(getMapDocument(), "voids"), mapWidth, mapHeight, flip);
        drawStructures(getStructures(getMapDocument(), "facilities"), mapWidth, mapHeight, flip);
        drawStructures(getStructures(getMapDocument(), "restroom"), mapWidth, mapHeight, flip);
    } catch (e) {
        alert(e);
    }
}

function drawStructures(structures, mapWidth, mapHeight, flip) {
    var xScale = getXScale(mapWidth, mapHeight);
    var yScale = getYScale(mapWidth, mapHeight);
    for (var i = 0; i < structures.length; i++) {
        var structureWidget = document.createElement("div");
        structureWidget.className = structures[i].type;
        structureWidget.type = structures[i].type;
        structureWidget.style.width = structures[i].width * xScale;
        structureWidget.style.height = structures[i].height * yScale;
        structureWidget.setAttribute("originalWidth", structures[i].width * xScale);
        structureWidget.setAttribute("originalHeight", structures[i].height * xScale);

        if (structureWidget.type == "cube") {
            var employeeName = getEmployeeNameByStructure(structures[i].description);
            if (employeeName != null) {
                var nameComponents = employeeName.split(" ");
                structureWidget.innerHTML = nameComponents.join("<br />");
                structureWidget.style.cursor = "hand";
                structureWidget.onclick = editStructure;
            } else {
                structureWidget.innerHTML = structures[i].description;
            }
        } else {
            structureWidget.innerHTML = structures[i].description;
        }
        structureWidget.id = structures[i].description;
        var x;
        var y;
        if (flip) {
            x = (mapWidth - structures[i].x - structures[i].width) * xScale + PADDING_LEFT;
            y = (mapHeight - structures[i].y - structures[i].height) * yScale + PADDING_TOP;
        } else {
            x = structures[i].x * xScale + PADDING_LEFT;
            y = structures[i].y * yScale + PADDING_TOP;
        }
        structureWidget.style.left = x;
        structureWidget.style.top = y;
        getMap().appendChild(structureWidget);
    }
}

function editStructure(e) {
    var target = (e) ? e.target : window.event.srcElement;
    if (target.type == "cube") {
        var employeelist = document.getElementById("employeelist");
        employeelist.value = target.id;
        showModifyDialog();
    }
}

function getXScale(mapWidth, mapHeight) {
    return getCanvasWidth(mapWidth, mapHeight) / mapWidth;
}

function getYScale(mapWidth, mapHeight) {
    return getCanvasHeight(mapWidth, mapHeight) / mapHeight;
}

function getCanvasWidth(mapWidth, mapHeight) {
    var maxWidth = document.body.clientWidth - PADDING_RIGHT - PADDING_LEFT;
    var maxHeight = document.body.clientHeight - PADDING_TOP;
    return Math.min(maxWidth, (mapWidth / mapHeight) * maxHeight);
}

function getCanvasHeight(mapWidth, mapHeight) {
    var maxWidth = document.body.clientWidth - PADDING_RIGHT - PADDING_LEFT;
    var maxHeight = document.body.clientHeight - PADDING_TOP - PADDING_BOTTOM;
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

function getStructures(mapDocument, type) {
    var structureGroupNode = selectNodes(mapDocument, "/map/structures/" + type)[0];
    var result = [];
    for (var i = 0; i < structureGroupNode.childNodes.length; i++) {
        var structureNode = structureGroupNode.childNodes[i];
        if (structureNode.nodeType == 1) {
            var structure = new Structure(structureNode.getAttribute("name"), structureNode.nodeName, structureNode.getAttribute("x"), structureNode.getAttribute("y"), structureNode.getAttribute("width"), structureNode.getAttribute("height"));
            result.push(structure);
        }
    }
    return result;
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
    if (quotesDocument == null) quotesDocument = loadXMLDoc("Quotes.xml");
    return quotesDocument;
}

function getEmployeeNameByStructure(structureName) {
    var employeeNode = selectNodes(getEmployees(), "employee[@structurename='" + structureName + "']")[0];
    if (employeeNode != null) {
        return employeeNode.getAttribute("name");
    } else {
        return null;
    }
}

function showQuote() {
    document.getElementById("bubble").style.display = "block";
    document.getElementById("quote").style.display = "block";
    document.getElementById("quote").innerHTML = getQuote();
    window.setTimeout("hideQuote()", 3000);
}

function showQuote() {
    hideQuote();
    document.getElementById("bubble").style.display = "block";
    document.getElementById("quote").style.display = "block";
    document.getElementById("quote").innerHTML = getQuote();
    quoteTimer = window.setTimeout("hideQuote()", 3000);
}

function hideQuote() {
    window.clearTimeout(quoteTimer);
    document.getElementById("bubble").style.display = "none";
    document.getElementById("quote").style.display = "none";
}

function isIe() {
    return (document.all) ? true : false;
}

function showModifyDialog() {
    var map = document.getElementById("map").style.opacity = .2;
    var dialog = document.getElementById("modification");
    var lookup = document.getElementById("lookup");
    var selector = document.getElementById("employeelist");
    var name = selector[selector.selectedIndex].text;
    var employee = selectNodes(getEmployees(), "employee[@name='" + name + "']")[0];
    if (employee != null) {
        document.getElementById("location").value = employee.getAttribute("structurename");
        document.getElementById("EmpName").value = employee.getAttribute("name");
    } else {
        document.getElementById("location").value = "";
        document.getElementById("EmpName").value = "";
    }
    dialog.style.display = "block";
}

function showAddDialog() {
    var map = document.getElementById("map").style.opacity = .2;

    var dialog = document.getElementById("modification");
    var lookup = document.getElementById("lookup");
    var selector = document.getElementById("employeelist");
    var name = selector[selector.selectedIndex].text;
    var employee = selectNodes(getEmployees(), "employee[@name='" + name + "']")[0];
    document.getElementById("location").value = "";
    document.getElementById("EmpName").value = "";
    dialog.style.display = "block";
}

function closeModification() {
    var map = document.getElementById("map").style.opacity = 1;

    var dialog = document.getElementById("modification");
    var lookup = document.getElementById("lookup");
    dialog.style.display = "none";
}

function deleteEmployee() {
    var selector = document.getElementById("employeelist");
    var name = trimWhitespace(document.getElementById("EmpName").value);
    if (name == "")
        alert("You must select a name to delete");
    else {
        var bConfirm = confirm("Are you sure you want to delete this employee?");
        if (bConfirm) {
            req = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
            if (req) {
                req.open("POST", "SetLocation.asp?name=" + encodeURIComponent(name) + "&delete=Y", false);
                isIe() ? req.send() : req.send(null);
                location.href = "index.html";
            }
        }
    }


}

function commitModification() {
    var selector = document.getElementById("employeelist");
    var name = trimWhitespace(document.getElementById("EmpName").value);
    var slocation = trimWhitespace(document.getElementById("location").value);
    if ((name == "") || (slocation == "") | (name.split(" ").length > 2)) {
        alert("You must enter a name (Firstname Lastname) and provide a location (cube number)");
    } else {
        req = new XMLHttpRequest();
        if (req) {
            req.open("POST", "/setlocation?name=" + encodeURIComponent(name) + "&location=" + encodeURIComponent(slocation), false);
            isIe() ? req.send() : req.send();
            location.href = "index.html";
        }
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