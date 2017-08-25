window.benchmarkClient = {
    displayUnit: 'runs/min',
    iterationCount: 10,
    testsCount: null,
    suitesCount: null,
    autoRun: false,
    _timeValues: [],
    _suitsTimeValues: [],
    _finishedTestCount: 0,
    _progressCompleted: null,
    willAddTestFrame: function (frame) {
        var main = document.querySelector('main');
        var style = getComputedStyle(main);
        frame.style.left = main.offsetLeft + parseInt(style.borderLeftWidth) + parseInt(style.paddingLeft) + 'px';
        frame.style.top = main.offsetTop + parseInt(style.borderTopWidth) + parseInt(style.paddingTop) + 'px';
    },
    willRunTest: function (suite, test) {
        document.getElementById('info').textContent = suite.name + ' ( ' + this._finishedTestCount + ' / ' + this.testsCount + ' )';
    },
    didRunTest: function () {
        this._finishedTestCount++;
        this._progressCompleted.style.width = (this._finishedTestCount * 100 / this.testsCount) + '%';
    },
    didRunSuites: function (measuredValues) {
        this._timeValues.push(measuredValues.total);
        for (var suit in measuredValues.tests) {
            if (!this._suitsTimeValues[suit])
                this._suitsTimeValues[suit] = [ measuredValues.tests[suit].total ];
            else
                this._suitsTimeValues[suit].push(measuredValues.tests[suit].total);
        }
    },
    willStartFirstIteration: function () {
        this._timeValues = [];
        this._suitsTimeValues = [];
        this._finishedTestCount = 0;
        this._progressCompleted = document.getElementById('progress-completed');
        document.getElementById('logo-link').onclick = function (event) { event.preventDefault(); return false; }
    },
    didFinishLastIteration: function () {
        document.getElementById('logo-link').onclick = null;

        var results = this._computeResults(this._timeValues, this.displayUnit);
        var suitsResults = [];
        var suitsScores = [];
        var suitsTimes = [];
        var geomeanScore = 1.0;
        for (var suit in this._suitsTimeValues) {
            suitsResults[suit] = this._computeResults(this._suitsTimeValues[suit], 'runs/min');
            suitsScores[suit] = (suitsResults[suit].mean / benchmarkClient.suitesCount).toFixed(2);
            suitsTimes[suit] = suitsResults[suit].totalTime.toFixed(2);
            console.log(suit + "," + suitsScores[suit] + ",Time(ms)," + suitsTimes[suit]);
            geomeanScore *= suitsScores[suit];
        }
        geomeanScore = Math.pow(geomeanScore, 1.0/benchmarkClient.suitesCount);

        running_end = performance.now();
        var running_time = running_end - running_start;
        this._updateGaugeNeedle(results.mean);
        console.log("Arithmetic-Mean," + results.mean.toFixed(2) + "Total-Time(ms)," + results.totalTime.toFixed(2));
        document.getElementById('result-number').textContent = results.formattedMean;
        if (results.formattedDelta)
            document.getElementById('confidence-number').textContent = '\u00b1 ' + results.formattedDelta;

        this._populateDetailedResults(results.formattedValues, suitsScores, suitsTimes);
        document.getElementById('results-with-statistics').textContent = results.formattedMeanAndDelta;
        document.getElementById('total-score-time').textContent = results.totalTime.toFixed(2);
        document.getElementById('total-running-time').textContent = running_time.toFixed(2);
        document.getElementById('geomean-score').textContent = geomeanScore.toFixed(2);

        if (this.displayUnit == 'ms') {
            document.getElementById('show-summary').style.display = 'none';
            showResultDetails();
        } else
            showResultsSummary();
    },
    _computeResults: function (timeValues, displayUnit) {
        var suitesCount = this.suitesCount;
        function totalTimeInDisplayUnit(time) {
            if (displayUnit == 'ms')
                return time;
            return computeScore(time);
        }

        function sigFigFromPercentDelta(percentDelta) {
            return Math.ceil(-Math.log(percentDelta)/Math.log(10)) + 3;
        }

        function toSigFigPrecision(number, sigFig) {
            var nonDecimalDigitCount = number < 1 ? 0 : (Math.floor(Math.log(number)/Math.log(10)) + 1);
            return number.toPrecision(Math.max(nonDecimalDigitCount, Math.min(6, sigFig)));
        }

        var totalTime = timeValues.reduce(function (a, b) { return a + b; }, 0);
        var values = timeValues.map(totalTimeInDisplayUnit);
        var sum = values.reduce(function (a, b) { return a + b; }, 0);
        var arithmeticMean = sum / values.length;
        var meanSigFig = 4;
        var formattedDelta;
        var formattedPercentDelta;
        if (window.Statistics) {
            var delta = Statistics.confidenceIntervalDelta(0.95, values.length, sum, Statistics.squareSum(values));
            if (!isNaN(delta)) {
                var percentDelta = delta * 100 / arithmeticMean;
                meanSigFig = sigFigFromPercentDelta(percentDelta);
                formattedDelta = toSigFigPrecision(delta, 2);
                formattedPercentDelta = toSigFigPrecision(percentDelta, 2) + '%';
            }
        }

        var formattedMean = toSigFigPrecision(arithmeticMean, Math.max(meanSigFig, 3));

        return {
            totalTime: totalTime,
            formattedValues: timeValues.map(function (time) {
                return toSigFigPrecision(totalTimeInDisplayUnit(time), 4) + ' ' + displayUnit;
            }),
            mean: arithmeticMean,
            formattedMean: formattedMean,
            formattedDelta: formattedDelta,
            formattedMeanAndDelta: formattedMean + (formattedDelta ? ' \xb1 ' + formattedDelta + ' (' + formattedPercentDelta + ')' : ''),
        };
    },
    _addFrameworksRow: function (table, name, cb) {
        var row = document.createElement('tr');
        var th = document.createElement('th');
        th.textContent = name;
        row.appendChild(th);
        row.appendChild(cb);
        table.appendChild(row);
    },
    _addDetailedResultsRow: function (table, iterationNumber, value) {
        var row = document.createElement('tr');
        var th = document.createElement('th');
        th.textContent = 'Iteration ' + (iterationNumber + 1);
        var td = document.createElement('td');
        td.textContent = value;
        row.appendChild(th);
        row.appendChild(td);
        table.appendChild(row);
    },
    _addSuitsScoresRow: function (table, suit, value, time) {
        if (table.innerHTML == '') {
            var row = document.createElement('tr');
            var th = document.createElement('th');
            var td1 = document.createElement('td');
            var td2 = document.createElement('td');
            th.textContent = "Subcase";
            td1.textContent = "Score (runs/min)";
            td2.textContent = "Time (ms)";
            row.appendChild(th);
            row.appendChild(td1);
            row.appendChild(td2);
            table.appendChild(row);
        }
        var row = document.createElement('tr');
        var th = document.createElement('th');
        var td1 = document.createElement('td');
        var td2 = document.createElement('td');
        th.textContent = suit;
        td1.textContent = value;
        td2.textContent = time;
        row.appendChild(th);
        row.appendChild(td1);
        row.appendChild(td2);
        table.appendChild(row);
    },
    _prepareFrameworks: function () {
        var args = location.search.substr(1).split(':');
        if (args[0] == "auto") {
            this.autoRun = true;
            args.shift();
        }
        var singleFramework = '';
        for (var i = 0; i < Suites.length; i++) {
            if (args[0] == Suites[i].name) {
                singleFramework = Suites[i].name;
                args.shift();
                break;
            }
        }
        var frameworksTables = document.querySelectorAll('.frameworks-table');
        frameworksTables[0].innerHTML = '';
        for (var i = 0; i < Suites.length; i++) {
            Suites[i].checkbox = document.createElement("INPUT");
            Suites[i].checkbox.setAttribute("type", "checkbox");
            if (singleFramework)
                Suites[i].checkbox.checked = singleFramework == Suites[i].name ? true : false;
            else
                Suites[i].checkbox.checked = !Suites[i].disabled;
            this._addFrameworksRow(frameworksTables[0], Suites[i].name, Suites[i].checkbox);
        }
    },
    _updateGaugeNeedle: function (rpm) {
        var needleAngle = Math.max(0, Math.min(rpm, 140)) - 70;
        var needleRotationValue = 'rotate(' + needleAngle + 'deg)';

        var gaugeNeedleElement = document.querySelector('#summarized-results > .gauge .needle');
        gaugeNeedleElement.style.setProperty('-webkit-transform', needleRotationValue);
        gaugeNeedleElement.style.setProperty('-moz-transform', needleRotationValue);
        gaugeNeedleElement.style.setProperty('-ms-transform', needleRotationValue);
        gaugeNeedleElement.style.setProperty('transform', needleRotationValue);
    },
    _populateDetailedResults: function (formattedValues, suitsScores, suitsTimes) {
        var resultsTables = document.querySelectorAll('.results-table');
        resultsTables[0].innerHTML = '';
        for (var i = 0; i < formattedValues.length; i++)
            this._addDetailedResultsRow(resultsTables[0], i, formattedValues[i]);
        resultsTables[1].innerHTML = '';
        for (var suit in suitsScores)
            this._addSuitsScoresRow(resultsTables[1], suit, suitsScores[suit], suitsTimes[suit]);
    },
    prepareUI: function () {
        this._prepareFrameworks();
        window.addEventListener('popstate', function (event) {
            if (event.state) {
                var sectionToShow = event.state.section;
                if (sectionToShow) {
                    var sections = document.querySelectorAll('main > section');
                    for (var i = 0; i < sections.length; i++) {
                        if (sections[i].id === sectionToShow)
                            return showSection(sectionToShow, false);
                    }
                }
            }
            return showSection('home', false);
        }, false);

        function updateScreenSize() {
            // FIXME: Detect when the window size changes during the test.
            var screenIsTooSmall = window.innerWidth < 850 || window.innerHeight < 650;
            document.getElementById('screen-size').textContent = window.innerWidth + 'px by ' + window.innerHeight + 'px';
            document.getElementById('screen-size-warning').style.display = screenIsTooSmall ? null : 'none';
        }

        window.addEventListener('resize', updateScreenSize);
        updateScreenSize();
    }
}

function enableOneSuite(suites, suiteToEnable)
{
    suiteToEnable = suiteToEnable.toLowerCase();
    var found = false;
    for (var i = 0; i < suites.length; i++) {
        var currentSuite = suites[i];
        if (currentSuite.name.toLowerCase() == suiteToEnable) {
            currentSuite.disabled = false;
            found = true;
        } else
            currentSuite.disabled = true;
    }
    return found;
}

function startBenchmark() {
    for (var i = 0; i < Suites.length; i++)
        Suites[i].disabled = !Suites[i].checkbox.checked;

    if (location.search.length > 1) {
        var parts = location.search.substring(1).split('&');
        for (var i = 0; i < parts.length; i++) {
            var keyValue = parts[i].split('=');
            var key = keyValue[0];
            var value = keyValue[1];
            switch (key) {
            case 'unit':
                if (value == 'ms')
                    benchmarkClient.displayUnit = 'ms';
                else
                    console.error('Invalid unit: ' + value);
                break;
            case 'iterationCount':
                var parsedValue = parseInt(value);
                if (!isNaN(parsedValue))
                    benchmarkClient.iterationCount = parsedValue;
                else
                    console.error('Invalid iteration count: ' + value);
                break;
            case 'suite':
                if (!enableOneSuite(Suites, value)) {
                    alert('Suite "' + value + '" does not exist. No tests to run.');
                    return false;
                }
                break;
            }
        }
    }

    var enabledSuites = Suites.filter(function (suite) { return !suite.disabled; });
    var totalSubtestCount = enabledSuites.reduce(function (testsCount, suite) { return testsCount + suite.tests.length; }, 0);
    benchmarkClient.testsCount = benchmarkClient.iterationCount * totalSubtestCount;
    benchmarkClient.suitesCount = enabledSuites.length;
    var runner = new BenchmarkRunner(Suites, benchmarkClient);
    runner.runMultipleIterations(benchmarkClient.iterationCount);

    return true;
}

function computeScore(time) {
    return 60 * 1000 * benchmarkClient.suitesCount / time;
}

function showSection(sectionIdentifier, pushState) {
    var currentSectionElement = document.querySelector('section.selected');
    console.assert(currentSectionElement);

    var newSectionElement = document.getElementById(sectionIdentifier);
    console.assert(newSectionElement);

    currentSectionElement.classList.remove('selected');
    newSectionElement.classList.add('selected');

    if (pushState)
        history.pushState({section: sectionIdentifier}, document.title);
}

function showHome() {
    showSection('home', true);
}

function startTest() {
    running_start = performance.now();
    if (startBenchmark())
        showSection('running');
}

function showResultsSummary() {
    showSection('summarized-results', true);
}

function showResultDetails() {
    showSection('detailed-results', true);
}

function showFrameworks() {
    showSection('frameworks', true);
}

function defaultFrameworks() {
    for (var i = 0; i < Suites.length; i++)
        Suites[i].checkbox.checked = Suites[i].name == "FlightJS-MailClient" ? false : true;
}

function clearFrameworks() {
    for (var i = 0; i < Suites.length; i++)
        Suites[i].checkbox.checked = false;
}

function showAbout() {
    showSection('about', true);
}

window.addEventListener('DOMContentLoaded', function () {
    if (benchmarkClient.prepareUI)
        benchmarkClient.prepareUI();
    if (benchmarkClient.autoRun)
        startTest();
});
