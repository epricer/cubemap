$(document).ready(function() {
    mapapp.initEvents();
    mapapp.init();
});

var mapapp = (function() {

    var quoteTimer = null;
    var employeeModel;
    var mapModel;
    var quotesModel;
    var cameraStream;

    return {
        initEvents: function() {
            $("#body").on('resize', mapapp.drawMap);
            $("#body").on('mousemove', mapapp.trackCursor);
            $("#deletebutton").on('click', mapapp.deleteEmployee);
            $("#savebutton").on('click', mapapp.commitModification);
            $("#closebutton").on('click', mapapp.closeModifyDialog);
            $("#photo").on('click', mapapp.showCamera);
            $("#video").on('click', mapapp.takePhoto);
            $("#mascot").on('click', mapapp.showQuote);

            mapapp.bindClickEdit($("#namelabel"), $("#name"));
        },

        bindClickEdit: function(label, input) {
            input.hide();
            label.click(mapapp.editField.bind(this, label, input));
            input.focusout(mapapp.endEditField.bind(this, label, input));
            input.keyup(function(e) {
                if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
                    mapapp.endEditField(label, input);
                    return false;
                } else {
                    return true;
                }
            });
        },

        editField: function(label, input) {
            input.val(label.html());
            label.hide();
            input.show();
            input.focus();
        },

        endEditField: function(label, input) {
            if (label.html() != input.val()) {
                label.html(input.val());
                mapapp.commitModification();
            }
            label.show();
            input.hide();
        },

        init: function() {

            $.when(
                $.ajax({ url: "/employees", cache: false }).done(function(data) {
                    employeeModel = data;
                }),
                $.ajax({ url: "/map", cache: false }).done(function(data) {
                    mapModel = data;
                }),
                $.ajax({ url: "/quotes", cache: false }).done(function(data) {
                    quotesModel = data;
                })
            ).then(function() {
                mapapp.drawMap();
            });
        },

        trackCursor: function(mouseEvent) {
            var xPosition = mouseEvent.clientX / mapapp.getWindowWidth();
            var yPosition = mouseEvent.clientY / mapapp.getWindowHeight();

            var zoomWidth = mapapp.getZoomWidth();
            var zoomHeight = mapapp.getZoomHeight();
            var left = (zoomWidth !== null) ? (mapapp.getWindowWidth() - zoomWidth) * xPosition : 0;
            var top = (zoomHeight !== null) ? (mapapp.getWindowHeight() - zoomHeight) * yPosition : 0;
            $("#map").css("left", left);
            $("#map").css("top", top);
        },

        getZoom: function() {
            return 1.3;
        },

        getWindowWidth: function() {
            return $(window).width();
        },

        getWindowHeight: function() {
            return $(window).height();
        },

        getZoomWidth: function() {
            if (mapModel.width * mapapp.getAutoScale(mapModel.width, mapModel.height) * mapapp.getZoom() < mapapp.getWindowWidth()) return null;
            return mapapp.getWindowWidth() * mapapp.getZoom();
        },

        getZoomHeight: function() {
            if (mapModel.height * mapapp.getAutoScale(mapModel.width, mapModel.height) * mapapp.getZoom() < mapapp.getWindowHeight()) return null;
            return mapapp.getWindowHeight() * mapapp.getZoom();
        },

        drawMap: function() {
            $("#map").css("transform", "scale(" + mapapp.getZoom() + "," + mapapp.getZoom() + ")");
            $("#map").empty();

            for (var i = 0; i < mapModel.structuregroups.length; i++) {
                var sg = mapModel.structuregroups[i];
                mapapp.drawStructures(sg.structures, mapModel.width, mapModel.height, sg.type);
            }
        },

        drawStructures: function(structures, mapWidth, mapHeight, type) {
            var scale = mapapp.getAutoScale(mapWidth, mapHeight);
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

                var employee = mapapp.getEmployeeByStructure(structure.name);
                if (employee !== null) {
                    structureDiv.html(employee.name.split(" ").join("<br />"));
                } else {
                    if (!structure.editable) structureDiv.html(structure.name);
                }

                if (structure.editable) {
                    structureDiv.click(mapapp.showModifyDialog.bind(this, structure));
                    structureDiv.css('cursor', 'pointer');
                }

                $("#map").append(structureDiv);
            }
        },

        getAutoScale: function(mapWidth, mapHeight) {
            // calculate a scaling factor that maximizes the map in the available screen
            var scaleX = $(window).width() / mapWidth;
            var scaleY = $(window).height() / mapHeight;
            return Math.floor(Math.min(scaleX, scaleY));
        },

        getQuote: function() {
            var i = Math.round(Math.random() * (quotesModel.length - 1));
            return quotesModel[i].quote;
        },

        getEmployeeByStructure: function(structureName) {

            for (var i = 0; i < employeeModel.length; i++) {
                if (employeeModel[i].structure === structureName) return employeeModel[i];
            }
            return null;
        },

        showQuote: function() {
            mapapp.hideQuote();
            $("#bubble").css("display", "block");
            $("#quote").css("display", "block");
            $("#quote").html(mapapp.getQuote());
            quoteTimer = window.setTimeout(mapapp.hideQuote, 3000);
        },

        hideQuote: function() {
            window.clearTimeout(quoteTimer);
            $("#bubble").css("display", "none");
            $("#quote").css("display", "none");
        },

        showModifyDialog: function(structure) {
            var employee = mapapp.getEmployeeByStructure(structure.name);
            var employeeName = (employee === null) ? "" : employee.name;
            $("#map").css("filter", "blur(3px)");

            $("#locationlabel").html(structure.name);
            $("#namelabel").html(employeeName);

            $("#photo").attr("src", (employee && employee.photo) ? employee.photo : "missing.png");
            $("#modification").css("display", "block");
            $("#modification").data("structurename", structure.name);
            $("#modification").data("previousname", employeeName);
            if (!$("#namelabel").html()) $("#namelabel").click();
        },

        closeModifyDialog: function() {
            $("#map").css("filter", "");
            $("#modification").css("display", "none");
            $("#controls").css("display", "block");
            $("#camera").css("display", "none");
            mapapp.hideCamera();
        },

        hideCamera: function() {
            if (cameraStream) {
                var tracks = cameraStream.getTracks();
                for (var i = 0; i < tracks.length; i++) {
                    tracks[i].stop();
                    $("#video").removeAttr("src");
                }
            }
            $("#video").attr("src", null);
        },

        showCamera: function() {
            var mediaConfig = { video: true };

            // Put video listeners into place
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia(mediaConfig).then(function(stream) {
                    cameraStream = stream;
                    var video = $('#video')[0];
                    $("#controls").css("display", "none");
                    $("#camera").css("display", "block");
                    video.src = window.URL.createObjectURL(cameraStream);
                    video.play();

                }).catch(function(err) {
                    alert("Can't access camera");
                });
            }
        },

        takePhoto: function() {
            var still = $("#still")[0];
            var stillContext = still.getContext('2d');

            var crop = $("#crop")[0];
            var cropContext = crop.getContext('2d');

            var video = $('#video')[0];

            stillContext.drawImage(video, 0, 0, 120, 90);
            cropContext.drawImage(still, 20, 0, 80, 90, 0, 0, 80, 90);
            $("#photo").attr("src", crop.toDataURL("image/jpeg", 0.7));
            $("#controls").css("display", "block");
            $("#camera").css("display", "none");
            mapapp.hideCamera();
            mapapp.commitModification();
        },

        removeEmployeeByName: function(name) {
            for (var i = 0; i < employeeModel.length; i++) {
                if (employeeModel[i].name === name) {
                    employeeModel.splice(i, 1);
                    break;
                }
            }
        },

        commitModification: function() {

            var newName = $("#name").val().trim();
            var previousName = $("#modification").data("previousname");
            var structureName = $("#modification").data("structurename");
            var photo = $("#photo").attr("src");
            if (previousName && !newName) {
                $.post("/delete?name=" + previousName)
                    .done(function() {
                        mapapp.removeEmployeeByName(previousName);
                        mapapp.drawMap();
                        mapapp.closeModifyDialog();
                    });
            } else {
                $.post("/update",
                        JSON.stringify({
                            "name": newName,
                            "structure": structureName,
                            "previousname": previousName,
                            "photo": photo
                        }))
                    .done(function(updatedEmployee) {
                        $("#modification").data("previousname", updatedEmployee.name);
                        mapapp.removeEmployeeByName(previousName);
                        employeeModel.push(updatedEmployee);
                        mapapp.drawMap();
                    });

            }
        }
    };
})();