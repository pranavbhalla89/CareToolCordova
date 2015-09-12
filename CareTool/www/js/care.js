// TODO: change all clicks to touchstart events for faster response
var sessionInfo = {
    peeteeId: 1,
    possibleAnswers: ["", "Dependent", "Substantial / Maximal Assistance", "Partial / Moderate Assistance", "Supervision / Touching Assistance", "Setup or Clean-Up Assistance", "Independent", "Not Attempted - Safety Concerns", "Not Applicable", "Not Completed", "Patient Refused"],
    answerShorts: ["dependent", "substantial", "partial", "supervision", "setup", "independent"]
};

function makeGetAsyncRequest(url, successCallback) {
    $.ajax({
        type: 'GET',
        // url: 'http://52.3.165.15:9000/' + url,
        url: 'http://192.168.1.13:9000/' + url,
        contentType: "application/json",
        processData: false
    }).done(function(response) {
        successCallback(response);
    }).fail(function(response) {
        console.log(response);
    })
}

function makePostAsyncRequest(url, data, successCallback) {
    $.ajax({
        type: 'POST',
        // url: 'http://52.3.165.15:9000/' + url,
        url: 'http://192.168.1.13:9000/' + url,
        data: JSON.stringify(data),
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
            var activityId = data.options.activityId;
            loadActivityDetail(activityId);
        } else if (data.toPage[0].id == "score-page") {
            var sessionType = data.options.sessionType;
            var patientId = data.options.patientId;
            createAssesment(patientId, sessionType);
        }
    });
    // Activity Detail Page
    // $("#activity-detail-page").on("pagebeforeshow", function(e, data) {
    //     var activityId = data.options.activityId;
    //     loadActivityDetail(activityId);
    // });
}

function loadExercises() {
    $.getJSON("json/learning.json", function(learningExcercise) {
        var source = $("#hbt-learning-list").html();
        var template = Handlebars.compile(source);
        var learningList = $("#learning-page .page-content ul")

        $.each(learningExcercise, function(index, item) {
            var html = template(item);
            var li = learningList.append(html);
        });

        // attach click handler
        $("#learning-page .page-content ul a").on('click', function() {
            var activityId = $(this).attr("data-activity-id");
            $.mobile.pageContainer.pagecontainer("change", "#activity-detail-page", {
                activityId: activityId
            });
        });
    });
}

function loadScheduledPatients() {
    makeGetAsyncRequest('patients/getMyPatients?peeteeId=' + sessionInfo.peeteeId, function(response) {
        var source = $("#hbt-patient-list").html();
        var template = Handlebars.compile(source);
        var patientList = $("#scheduling-page .page-content div");

        patientList.empty();
        $.each(response, function(index, patient) {
            var html = template(patient);
            patientList.append(html).trigger('create');
        });

        $("#scheduling-page .page-content a.scheduling-page-a").on('click', function() {
            var patientId = $(this).attr("data-patient-id");
            if ($(this).hasClass("score")) {
                // score
                $("#document-session-type-popup").popup("open");
                $("#document-session-type-next").on('click', function() {
                    var sessionType = $('input:radio[name=document-session-type-choice]:checked').val();
                    $.mobile.pageContainer.pagecontainer("change", "#score-page", {
                        sessionType: sessionType,
                        patientId: patientId
                    });
                });
            } else {
                // notes
                // $.mobile.pageContainer.pagecontainer("change", "#activity-detail-page", {
                //     activityId: activityId
                // });
            }
        });
    });
}

function loadActivityDetail(activityId) {
    var url = "json/" + activityId + ".json";
    $.getJSON(url, function(activityDetail) {
        var source = $("#hbt-activity-detail").html();
        var template = Handlebars.compile(source);
        var activityPageContent = $("#activity-detail-page .page-content");
        // clear the existing content
        activityPageContent.empty();
        var html = template(activityDetail);
        activityPageContent.append(html);
    });
}

function createAssesment(patientId, sessionType) {
    var assessment = {
        "peetee_id": sessionInfo.peeteeId,
        "patient_id": patientId,
        "type": sessionType
    };
    var assessmentId = null;
    makePostAsyncRequest('assessment/create', assessment, function(response) {
        console.log(response);
        sessionInfo.assessmentId = response.split(":")[1];
        loadQuestions();
    });
}

function loadQuestions() {
    if (sessionInfo.exerciseList != null && sessionInfo.exerciseList != undefined) {
        showQuestion(sessionInfo.exerciseList[0].name);
    }
    makeGetAsyncRequest('careTool/items/', function(response) {
        console.log(response);
        sessionInfo.exerciseList = response;
        sessionInfo.currentExercise = 0;
        showQuestion(response[0].name);
    });
}

function showQuestion(name) {

    makeGetAsyncRequest('careTool/items/name/' + name, function(question) {
        $("#score-page .careHeader h1").text("Score " + question.name);


        // $("#score-page .score-choice-text.dependent")answerShorts

        $('input:radio[name=radio-score-choice]').change(function() {
            $('input:radio[name=radio-score-choice]:checked').val()
        });


        //Description
        // $("#score-page-score-desc").html(question.description);
        // //Exceptions
        // var u = "";
        // var redX = "<span style='color:red'>&#10008</span> ";
        // for (var i in question.exceptions) {
        //     u += redX + question.exceptions[i];
        //     if (i < question.exceptions.length) u += "<br>";
        // }
        // $("#score-page-score-excep").html(u);
        // //Tips
        // var v = "";
        // var grnChk = "<span style='color:green'>&#10003</span> ";
        // for (var j in question.tips) {
        //     v += grnChk + question.tips[j];
        //     if (i < question.exceptions.length) v += "<br>";
        // }
        // $("#score-page-score-tips").html(v);

        // // replace the scoring details with tips for this excercise
        // var currentQuestion = storeObject.exerciseList[storeObject.currentExercise];
        // var fileName = "json/" + currentQuestion.code + ".json";
        // $.getJSON(fileName, function(result) {
        //     // var templateHTML = storeObject.questionTemplateHTML;
        //     $.each(storeObject.answerShorts, function(i, value) {
        //         var tipList = result[value],
        //             textToReplace = "";
                    
        //         $.each(tipList, function(index) {
        //             textToReplace += tipList[index] + "<br/>";
        //         });
        //         //templateHTML = templateHTML.replace("{" + value + "}", textToReplace)
        //         // $("#radio-score-choice-" + (i+1)).siblings("label").html((i + 1) + ". " + value + "<br/>" + textToReplace);
        //         $("#radio-score-choice-" + (i+1) + "-popup").html(textToReplace);
        //     });
        // });

        // $('input:radio[name=radio-score-choice]').change(function() {
        //     $("#score-page-scoring").popup("close");
        // });
    });

}