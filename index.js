var quotesDocument = null;
var quoteTimer = null;
var employeeModel;
var mapModel;
var quotesModel;

function trackCursor(mouseEvent) {
    var xPosition = mouseEvent.clientX / getWindowWidth();
    var yPosition = mouseEvent.clientY / getWindowHeight();

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

function drawMap() {
    $("#map").css("transform", "scale(" + getZoom() + "," + getZoom() + ")");
    $("#map").empty();

    for (var i = 0; i < mapModel.structuregroups.length; i++) {
        var sg = mapModel.structuregroups[i];
        drawStructures(sg.structures, mapModel.width, mapModel.height, sg.type);
    }
}


function init() {

    $.when(
        $.ajax({ url: "/employees.json", cache: false }).done(function(data) {
            employeeModel = JSON.parse(data);
        }),
        $.ajax({ url: "/map.json", cache: false }).done(function(data) {
            mapModel = JSON.parse(data);
        }),
        $.ajax({ url: "/quotes.json", cache: false }).done(function(data) {
            quotesModel = JSON.parse(data);
        })
    ).then(function() {
        drawMap();
    });
}


function drawStructures(structures, mapWidth, mapHeight, type) {
    var scale = getAutoScale(mapWidth, mapHeight);
    for (var i = 0; i < structures.length; i++) {
        var structure = structures[i];
        var structureDiv = $("<div></div>");
        structureDiv.addClass(type);
        structureDiv.css("width", structure.width * scale);
        structureDiv.css("height", structure.height * scale);
        structureDiv.css("left", (mapWidth - structure.x - structure.width) * scale);
        structureDiv.css("top", (mapHeight - structure.y - structure.height) * scale);
        structureDiv.attr("id", structure.name); // todo: is this needed?
        structureDiv.data("structure", structure);

        var employee = getEmployeeByStructure(structure.name);
        if (employee !== null) {
            structureDiv.html(employee.name.split(" ").join("<br />"));
        } else {
            structureDiv.html(structure.name);
        }

        if (structure.editable) {
            structureDiv.click(showModifyDialog.bind(this, structure));
            structureDiv.css('cursor', 'pointer');
        }

        $("#map").append(structureDiv);
    }
}

function getAutoScale(mapWidth, mapHeight) {
    // calculate a scaling factor that maximizes the map in the available screen
    var scaleX = $(window).width() / mapWidth;
    var scaleY = $(window).height() / mapHeight;
    return Math.floor(Math.min(scaleX, scaleY));
}

function getQuote() {
    var i = Math.round(Math.random() * (quotesModel.length - 1));
    return quotesModel[i].quote;
}

function getEmployeeByStructure(structureName) {

    for (var i = 0; i < employeeModel.length; i++) {
        if (employeeModel[i].structure === structureName) return employeeModel[i];
    }
    return null;
}

function showQuote() {
    hideQuote();
    $("#bubble").css("display", "block");
    $("#quote").css("display", "block");
    $("#quote").html(getQuote());
    quoteTimer = window.setTimeout(hideQuote, 3000);
}

function hideQuote() {
    window.clearTimeout(quoteTimer);
    $("#bubble").css("display", "none");
    $("#quote").css("display", "none");
}

function showModifyDialog(structure) {
    var employee = getEmployeeByStructure(structure.name);
    var employeeName = (employee === null) ? "" : employee.name;
    $("#map").css("filter", "blur(3px)");

    $("#location").val(structure.name);
    $("#name").val(employeeName);
    $("#name").data("oldvalue", employeeName);
    $("#modification").css("display", "block");
}

function closeModification() {
    $("#map").css("filter", "");
    $("#modification").css("display", "none");
}

function deleteEmployee() {
    var name = $("#name").val().trim();

    if (name === "")
        alert("You must select a name to delete");
    else {
        $.post("/delete?name=" + name)
            .done(function() {
                closeModification();
                init();
            });
    }
}

function commitModification() {

    var employeeName = $("#name").val().trim();
    var newLocation = $("#location").val().trim();
    if ((employeeName === "") || (newLocation === "")) {
        alert("You must enter a name (Firstname Lastname) and provide a location (cube number)");
    } else {
        $.post("/setlocation", JSON.stringify({ "name": employeeName, "structure": newLocation, "previousname": $("#name").data("oldvalue") }))
            .done(function(data) {
                closeModification();
                init();
            });
    }
}