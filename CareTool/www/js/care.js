// TODO: change all clicks to touchstart events for faster response
var sessionInfo = {
    peeteeId: 1
};

function makeGetAsyncRequest(url, successCallback) {
    $.ajax({
        type: 'GET',
      //  url: 'http://52.3.165.15:9000/' + url,
         url: 'http://192.168.1.13:9000/' + url,
        contentType: "application/json",
        processData: false
    }).done(function(response) {
        successCallback(response);
    }).fail(function(response) {
        console.log(response);
    })
}

function registerPageInits() {
    $.mobile.pageContainer.pagecontainer("change", "#landing-page");

    // Learning page
    $("#learning-page").on("pagebeforecreate", function() {
        loadExercises();
    });
    // Scheduling page
    $("#scheduling-page").on("pagebeforeshow", function() {
        loadScheduledPatients();
    });

    $(document).on("pagebeforechange", function(e, data) {
        if (data.toPage[0].id == "activity-detail-page") {
            var activityName = data.options.activityName;
            loadActivityDetail(activityName);
        }
    });
    // Activity Detail Page
    // $("#activity-detail-page").on("pagebeforeshow", function(e, data) {
    //     var activityId = data.options.activityId;
    //     loadActivityDetail(activityId);
    // });
}

function loadExercises() {
    makeGetAsyncRequest('careTool/items/', function(learningExcercise) {
        var source = $("#hbt-learning-list").html();
        var template = Handlebars.compile(source);
        var learningList = $("#learning-page .page-content ul")

        $.each(learningExcercise, function(index, item) {
            var html = template(item);
            var li = learningList.append(html);
        });

        // attach click handler
        $("#learning-page .page-content ul a").on('click', function() {
            var activityName = $(this).attr("data-activity-name");
            $.mobile.pageContainer.pagecontainer("change", "#activity-detail-page", {
                activityName: activityName
            });
        });
    });
}

function loadScheduledPatients() {
    makeGetAsyncRequest('patients/getMyPatients?peeteeId=' + sessionInfo.peeteeId, function(response) {
        var source = $("#hbt-patient-list").html();
        var template = Handlebars.compile(source);
        var patientList = $("#scheduling-page .page-content ul");

        $.each(response, function(index, patient) {
            var html = template(patient);
            patientList.append(html);
        });
    });
}

function loadActivityDetail(activityName) {
   // var url = "json/" + activityId + ".json";
    makeGetAsyncRequest('careTool/items/name/' + activityName, function(activityDetail) {
        var source = $("#hbt-activity-detail").html();
        var template = Handlebars.compile(source);
        var activityPageContent = $("#activity-detail-page .page-content");
        // clear the existing content
        activityPageContent.empty();
        var html = template(activityDetail);
        activityPageContent.append(html);
    });
}