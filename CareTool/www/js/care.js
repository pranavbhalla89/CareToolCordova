// TODO: change all clicks to touchstart events for faster response
var sessionInfo = {
    peeteeId: 1,
    possibleAnswers: ["", "Dependent", "Substantial / Maximal Assistance", "Partial / Moderate Assistance", "Supervision / Touching Assistance", "Setup or Clean-Up Assistance", "Independent", "Not Attempted - Safety Concerns", "Not Applicable", "Not Completed", "Patient Refused"],
    answerShorts: ["dependent", "substantial", "partial", "supervision", "setup", "independent"],
    savedAnswers: []
};

function loading(showOrHide) {
    setTimeout(function() {
        $.mobile.loading(showOrHide);
    }, 1);
}

function makeGetAsyncRequest(url, successCallback) {
    loading("show");
    $.ajax({
        type: 'GET',
        url: 'http://54.175.31.213:9000/' + url,
        // url: 'http://192.168.1.13:9000/' + url,
        // url: 'http://10.0.14.122:9000/' + url,
        contentType: "application/json",
        processData: false
    }).done(function(response) {
        loading("hide");
        successCallback(response);
    }).fail(function(response) {
        loading("hide");
        console.log(response);
    })
}

function makePostAsyncRequest(url, data, successCallback) {
    loading("show");
    $.ajax({
        type: 'POST',
        url: 'http://54.175.31.213:9000/' + url,
        // url: 'http://192.168.1.13:9000/' + url,
        // url: 'http://10.0.14.122:9000/' + url,
        data: JSON.stringify(data),
        contentType: "application/json",
        processData: false
    }).done(function(response) {
        loading("hide");
        successCallback(response);
    }).fail(function(response) {
        loading("hide");
        console.log(response);
    })
}

function registerPageInits() {
    // header spacing for iOs devices
    if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
        $("body").addClass("headerMargin");
    }

    $.mobile.pageContainer.pagecontainer("change", "#landing-page");

    // Learning page
    $("#learning-page").on("pagebeforecreate", function() {
        loadExercises();
    });
    // Scheduling page
    $("#scheduling-page").on("pagebeforeshow", function() {
        loadScheduledPatients();
    });

    $("#score-page").on("pagebeforecreate", function() {
        registerAnswerSubmit();
    });

    $(document).on("pagebeforechange", function(e, data) {
        if (data.toPage[0].id == "activity-detail-page") {
            var activityName = data.options.activityName;
            loadActivityDetail(activityName);
        } else if (data.toPage[0].id == "score-page") {
            if (data.options.sessionType == null || data.options.patientId == null) {
                e.preventDefault();
            } else {
                var sessionType = data.options.sessionType;
                var patientId = data.options.patientId;
                createAssesment(patientId, sessionType);
            }
        } else if (data.toPage[0].id == "patient-history-list-page" && data.options.patientId != null) {
            var patientId = data.options.patientId;
            loadHistoryList(patientId);
        } else if (data.toPage[0].id == "patient-history-detail-page" && data.options.itemIndex != null) {
            var itemIndex = data.options.itemIndex;
            loadHistory(itemIndex);
        }
    });
}

function loadExercises() {
    makeGetAsyncRequest('careTool/items/', function(learningExcercise) {
        var source = $("#hbt-learning-list").html();
        var template = Handlebars.compile(source);
        var mobilityLearningList = $("#learning-page .page-content ul.mobility")
        var selfcareLearningList = $("#learning-page .page-content ul.selfcare")

        $.each(learningExcercise, function(index, item) {
            var html = template(item);
            if(item.set == "Self-Care")
                var selfcareli = selfcareLearningList.append(html);
            if(item.set == "Mobility")
                var mobilityli = mobilityLearningList.append(html);
        });

        // attach click handler
        $("#learning-page .page-content ul a").on('tap', function() {
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
        var patientList = $("#scheduling-page .page-content div");

        patientList.empty();
        $.each(response, function(index, patient) {
            var html = template(patient);
            patientList.append(html).trigger('create');
        });

        $("#scheduling-page .page-content a.scheduling-page-a").on('tap', function() {
            var patientId = $(this).attr("data-patient-id");
            if ($(this).hasClass("score")) {
                // score
                $("#document-session-type-popup").popup("open");
                $("#document-session-type-next").on('tap', function() {
                    var sessionType = $('input:radio[name=document-session-type-choice]:checked').val();
                    $.mobile.pageContainer.pagecontainer("change", "#score-page", {
                        sessionType: sessionType,
                        patientId: patientId
                    });
                });
            } else {
                // history
                $.mobile.pageContainer.pagecontainer("change", "#patient-history-list-page", {
                    patientId: patientId
                });
            }
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
        loadScorePageMenuItems(sessionInfo.exerciseList);
    } else {
        makeGetAsyncRequest('careTool/items/', function(response) {
            console.log(response);
            sessionInfo.exerciseList = response;
            sessionInfo.currentExercise = 0;
            showQuestion(response[0].name);
            loadScorePageMenuItems(sessionInfo.exerciseList);
        });
    }
}

function loadScorePageMenuItems(exerciseList) {
    var source = $("#hbt-score-page-menu").html();
    var template = Handlebars.compile(source);
    var mobilityScorePageMenuList = $("#score-page-menu-panel div.mobility p");
    var selfcareScorePageMenuList = $("#score-page-menu-panel div.selfcare p");
    mobilityScorePageMenuList.empty();
    selfcareScorePageMenuList.empty();

    $.each(exerciseList, function(index, item) {
        var viewItem = {
            name: item.name,
            index:  index
        };
        var html = template(viewItem);
        if (item.set == "Mobility") {
            mobilityScorePageMenuList.append(html);
        } else {
            selfcareScorePageMenuList.append(html);
        }
    });

    $("#score-page-menu-panel p a").on('tap', function(){
        $("#score-page-menu-panel").panel( "close" );
        var itemIndex = $(this).attr("data-menu-index");
        sessionInfo.currentExercise = itemIndex;
        showQuestion(sessionInfo.exerciseList[sessionInfo.currentExercise].name, sessionInfo.savedAnswers[sessionInfo.currentExercise]);
    });
    
}

function showQuestion(name, answer) {

    makeGetAsyncRequest('careTool/items/name/' + name, function(question) {
        $("#score-page .page-content h1").text(question.name);

        $.each(sessionInfo.answerShorts, function(i, value) {
            var tip = question[value],
                classSelector = ".score-choice-text." + value;
            $("#score-page " + classSelector).text(tip);
        });

        if (answer != null) {
            $("#score-notes").val(answer.text);
            var radioSelector = "#radio-score-choice-" + answer.score;
            $("input:radio[name=radio-score-choice]").checkboxradio("refresh");
            $(radioSelector).attr("checked", true);
        }

        $('input:radio[name=radio-score-choice]').change(function() {
            $("#score-page .score-choice-text.selected").removeClass("selected").hide();
            $('input:radio[name=radio-score-choice]:checked').closest("div").next(".score-choice-text").show().addClass("selected");
        });

    });
}

function registerAnswerSubmit() {
    // handle file selection
    $('#score-media').on('change', function(event) {
        sessionInfo.fileToUpload = event.target.files;
    });

    // handle assessment submission
    $("#manager-submit").on('tap', function() {
        makePostAsyncRequest('assessment/sendToManager/' + sessionInfo.assessmentId, null, function() {
            $("#score-page-submit-manager").popup("close");
            alert('Submitted to manager');
            $.mobile.pageContainer.pagecontainer("change", "#scheduling-page");

            var data = {
                "email": "sergmor@gmail.com",
                "pt": "Cosmo Kramer",
                "patient": "John Doe"
            }
            makePostAsyncRequest('notify/assessment', data, function(){});
        });
    });

    $("#score-page a.ui-icon-arrow-l").on('tap', function() {
        sessionInfo.currentExercise--;
        showQuestion(sessionInfo.exerciseList[sessionInfo.currentExercise].name, sessionInfo.savedAnswers[sessionInfo.currentExercise]);
    });

    $("#score-page a.ui-icon-arrow-r").on('tap', function() {
        var assignedScore = $('input:radio[name=radio-score-choice]:checked').val();
        if (assignedScore != undefined && assignedScore != null) {
            var answer = {
                "timestamp": (new Date()).getTime(),
                "code": sessionInfo.exerciseList[sessionInfo.currentExercise].code,
                "score": $('input:radio[name=radio-score-choice]:checked').val(),
                "peeteeId": sessionInfo.peeteeId,
                "text": $("#score-notes").val(),
                "mediaUrl": null
            }

            if (sessionInfo.fileToUpload != null && sessionInfo.fileToUpload != undefined && sessionInfo.fileToUpload.length != 0) {
                // upload file to S3
                var data = new FormData();
                $.each(sessionInfo.fileToUpload, function(key, value) {
                    data.append("file", value);
                });

                loading("show");
                $.ajax({
                    url: 'http://54.175.31.213:9000/assessment/uploadFile',
                    // url: 'http://192.168.1.13:9000/assessment/uploadFile',
                    // url: 'http://10.0.14.122:9000/assessment/uploadFile',
                    type: 'POST',
                    data: data,
                    cache: false,
                    processData: false, // Don't process the files
                    contentType: false, // Set content type to false as jQuery will tell the server its a query string request
                }).done(function(response) {
                    console.log(response);
                    loading("hide");
                    answer.mediaUrl = response;

                    submitAnswer(sessionInfo.assessmentId, answer);

                }).fail(function(error) {
                    loading("hide");
                    alert(JSON.stringify(error));
                });
            } else {
                submitAnswer(sessionInfo.assessmentId, answer);
            }
        } else {
            alert("Please make a choice first");
        }
    });
}

function submitAnswer(assessmentId, answer) {

    makePostAsyncRequest('assessment/addScore?assessmentId=' + assessmentId, answer, function(response) {
        // save the answers to session
        sessionInfo.savedAnswers[sessionInfo.currentExercise] = answer;
        // clear the existing choices
        $("#score-notes").val("");
        $("#score-media").val('');

        $('input:radio[name=radio-score-choice]:checked').removeAttr("checked");
        $("input:radio[name=radio-score-choice]").checkboxradio("refresh");
        $("#score-page .score-choice-text.selected").removeClass("selected").hide();

        // goto next question
        sessionInfo.currentExercise++;
        if (sessionInfo.currentExercise == sessionInfo.exerciseList.length) {
            $("#score-page-submit-manager").popup("open");
        } else {
            showQuestion(sessionInfo.exerciseList[sessionInfo.currentExercise].name);
        }
    });

}

function loadHistoryList(patientId) {
    makeGetAsyncRequest('patients/getHistory?patientId=' + patientId, function(res) {
        // new Date(res[h].createdTimestamp)).toDateString()
        // res[h].evaluator.firstName + " " + res[h].evaluator.lastName

        sessionInfo.patientHistory = res;
        var source = $("#hbt-history-list").html();
        var template = Handlebars.compile(source);
        var historyList = $("#patient-history-list-page .page-content ul");
        historyList.empty();

        $.each(res, function(index, item) {
            var viewItems = {
                firstName: item.evaluator.firstName,
                lastName: item.evaluator.lastName,
                date: (new Date(item.createdTimestamp)).toDateString(),
                dataSessionIndex: index
            }

            var html = template(viewItems);
            historyList.append(html);
        });

        $("#patient-history-list-page .page-content ul a").on('tap', function() {
            var index = $(this).attr("dataSessionIndex");
            $.mobile.pageContainer.pagecontainer("change", "#patient-history-detail-page", {
                itemIndex: index
            });
        });

    });
}

function loadHistory(itemIndex) {
    var chosenSession = sessionInfo.patientHistory[itemIndex];
    $("#patient-history-detail-page");
    var source = $("#hbt-history-detail-score").html();
    var template = Handlebars.compile(source);
    var scoreList = $("#patient-history-detail-page .page-content ul");
    scoreList.empty();

    $.each(chosenSession.scores, function(index, item) {
        var viewItems = {
            scoreDescription: sessionInfo.possibleAnswers[item.score],
            activityName: item.name,
            image: chosenSession.documentation[index].pathToAttachment,
            comments: chosenSession.documentation[index].comments
        }

        var html = template(viewItems);
        scoreList.append(html);
    });
}