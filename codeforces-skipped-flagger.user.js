// ==UserScript==
// @name         Skipped Flagger
// @version      1.0.0
// @description  flags people with skipped contests. useful info in console (press f12)
// @author       temporary1
// @match        https://codeforces.com/*
// @match        http://codeforces.com/*
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

/* globals $, GM_config */

(function () {
    "use strict";

    let NUM_CONTESTS = GM_getValue('NUM_CONTESTS',50); // how many recently participated contests itll check at max per person
    // unrated contests (heuristics, cpc mirrors, etc.) will also contribute to this number when checking

    let START_CHECK = GM_getValue('START_CHECK',2000); // number of submissions it starts calling for (itll call x, x, 2x, 4x, ... until it gets NUM_CONTESTS contests)
    // setting this number too high or too low will affect speed (api calls are not instant)
    // you usually dont have to tweak this number

    let FLASH_CHECKED = GM_getValue('FLASH_CHECKED',true); // if true, after a name is checked itll flash

    let FLASH_FLAGGED = GM_getValue('FLASH_FLAGGED',true); // if true, flagged names will continuously flash a crimson color
    // if this is false, flagged names will retain their original color
    // to make them have crimson color, just set this to true and set FLASH_WINDOW to a big number

    let FLASH_WINDOW = GM_getValue('FLASH_WINDOW',500); // time in miliseconds between flagged flashes

    let SHOW_WARNING = GM_getValue('SHOW_WARNING',true); // if true, a ⚠️ will be displayed after names that have been flagged

    let SHOW_HOURGLASS = GM_getValue('SHOW_HOURGLASS',true); // if true, an ⏳ will be displayed after the name that its checking
    // from my experience the ⏳ is pretty annoying but you do you

    let CONSOLE_LOGS = GM_getValue('CONSOLE_LOGS',true); // if true, itll log stuff in console

    let scanAdmin = GM_getValue('scanAdmin',false);
    let scan4000 = GM_getValue('scan4000',false);
    let scanLGM = GM_getValue('scanLGM',false);
    let scanIGM = GM_getValue('scanIGM',false);
    let scanGM = GM_getValue('scanGM',false);
    let scanIM = GM_getValue('scanIM',false);
    let scanM = GM_getValue('scanM',true);
    let scanCM = GM_getValue('scanCM',true);
    let scanBlue = GM_getValue('scanBlue',true);
    let scanCyan = GM_getValue('scanCyan',true);
    let scanGreen = GM_getValue('scanGreen',true);
    let scanGrey = GM_getValue('scanGrey',true);
    let scanUnrated = GM_getValue('scanUnrated',true);
    // i didnt bother to figure out a clever way to do this

    let gmc = new GM_config(
        {
            'id': 'sfcfg',
            'title': 'Skipped Flagger 1.0.0 Config',
            'fields':
            {
                'NUM_CONTESTS': { label: 'NUM_CONTESTS', section: ['Configurable Options'], type: 'int', default: 50 },
                'START_CHECK': { label: 'START_CHECK', type: 'int', default: 2000 },
                'FLASH_CHECKED': { label: 'FLASH_CHECKED', type: 'checkbox', default: true },
                'FLASH_FLAGGED': { label: 'FLASH_FLAGGED', type: 'checkbox', default: true },
                'FLASH_WINDOW': { label: 'FLASH_WINDOW', type: 'int', default: 500 },
                'SHOW_WARNING': { label: 'SHOW_WARNING', type: 'checkbox', default: true },
                'SHOW_HOURGLASS': { label: 'SHOW_HOURGLASS', type: 'checkbox', default: false },
                'CONSOLE_LOGS': { label: 'CONSOLE_LOGS', type: 'checkbox', default: true },
                'scanAdmin': { label: 'Headquarters', section: ['Ranks to Check'], type: 'checkbox', default: false },
                'scan4000': { label: '4000', type: 'checkbox', default: false },
                'scanLGM': { label: 'LGM', type: 'checkbox', default: false },
                'scanIGM': { label: 'IGM', type: 'checkbox', default: false },
                'scanGM': { label: 'GM', type: 'checkbox', default: false },
                'scanIM': { label: 'IM', type: 'checkbox', default: false },
                'scanM': { label: 'M', type: 'checkbox', default: true },
                'scanCM': { label: 'CM', type: 'checkbox', default: true },
                'scanBlue': { label: 'Blue', type: 'checkbox', default: true },
                'scanCyan': { label: 'Cyan', type: 'checkbox', default: true },
                'scanGreen': { label: 'Green', type: 'checkbox', default: true },
                'scanGrey': { label: 'Grey', type: 'checkbox', default: true },
                'scanUnrated': { label: 'Unrated', type: 'checkbox', default: true }
            },
            'events':
            {
                'open': function () {
                    let iframe = document.querySelector("#sfcfg");
                    if (!iframe) {
                        console.log("couldnt find iframe");
                        return;
                    }
                    let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    function modiframe(selector, callback) {
                        let element = iframeDoc.querySelector(selector);
                        callback(element);
                    }
                    modiframe("#sfcfg_header", (elm) => {
                        let descdiv = document.createElement("div");
                        descdiv.innerText = `flags people with skipped contests. useful info in console (press f12)`;
                        descdiv.style.cssText = "font-size: 14px; color: gray; margin-top: 5px; text-align: center";
                        elm.insertAdjacentElement("afterend", descdiv);
                    });
                    function addDesc(selector, desc) {
                        modiframe(`#sfcfg_${selector}_var`, (elm) => {
                            let descdiv = document.createElement("div");
                            descdiv.innerText = desc;
                            descdiv.style.cssText = "font-size: 12px; color: gray; margin-top: 5px;";
                            elm.appendChild(descdiv);
                        });
                    }
                    function chain(selector) {
                        modiframe(`#sfcfg_${selector}_var`, (elm) => {
                            elm.style.display = "inline-block";
                            elm.style.marginRight = "15px";
                        });
                    }
                    addDesc("NUM_CONTESTS",`how many recently participated contests itll check at max per person
                        unrated contests (heuristics, cpc mirrors, etc.) will also contribute to this number when checking`);
                    addDesc("START_CHECK",`number of submissions it starts calling for (itll call x, x, 2x, 4x, ... until it gets NUM_CONTESTS contests)
                        setting this number too high or too low will affect speed (api calls are not instant)
                        you usually dont have to tweak this number`);
                    addDesc("FLASH_CHECKED",`if true, after a name is checked itll flash`);
                    addDesc("FLASH_FLAGGED",`if true, flagged names will continuously flash a crimson color
                            if this is false, flagged names will retain their original color
                            to make them have crimson color, just set this to true and set FLASH_WINDOW to a big number`);
                    addDesc("FLASH_WINDOW",`time in miliseconds between flagged flashes`);
                    addDesc("SHOW_WARNING",`if true, a ⚠️ will be displayed after names that have been flagged`);
                    addDesc("SHOW_HOURGLASS",`if true, an ⏳ will be displayed after the name that its checking`);
                    addDesc("CONSOLE_LOGS",`if true, itll log stuff in console`);
                    chain("scanAdmin");chain("scan4000");chain("scanLGM");chain("scanIGM");chain("scanGM");chain("scanIM");chain("scanM");
                    chain("scanCM");chain("scanBlue");chain("scanCyan");chain("scanGreen");chain("scanGrey");chain("scanUnrated");
                },
                'save': function () {
                    function updateConfig(configName) {
                        const val = gmc.get(configName);
                        GM_setValue(configName, val)
                    }
                    updateConfig('NUM_CONTESTS');updateConfig('START_CHECK');updateConfig('FLASH_CHECKED');updateConfig('FLASH_FLAGGED');
                    updateConfig('FLASH_WINDOW');updateConfig('SHOW_WARNING');updateConfig('SHOW_HOURGLASS');updateConfig('CONSOLE_LOGS');
                    updateConfig('scanAdmin');updateConfig('scan4000');updateConfig('scanLGM');updateConfig('scanIGM');updateConfig('scanGM');
                    updateConfig('scanIM');updateConfig('scanM');updateConfig('scanCM');updateConfig('scanBlue');updateConfig('scanCyan');
                    updateConfig('scanGreen');updateConfig('scanGrey');updateConfig('scanUnrated');
                    location.reload();
                }
            }
        });
    GM_registerMenuCommand("Open Config", () => gmc.open());

    const unratedContests = new Set([
        21,39,44,45,52,64,72,76,100,125,130,134,147,153,158,159,162,170,179,184,188,206,207,
        209,210,212,267,290,291,306,307,310,323,328,345,386,395,409,410,422,423,428,440,470,
        473,481,484,485,491,502,503,511,517,522,523,530,531,537,539,561,563,564,565,575,589,
        597,598,600,609,612,616,619,620,622,628,630,632,636,637,638,640,642,644,646,647,652,
        654,656,660,661,665,678,683,684,690,691,692,693,694,702,703,710,717,720,726,728,730,
        751,753,762,769,770,774,775,783,784,792,795,802,813,817,818,824,826,829,836,837,838,
        845,846,847,852,856,857,858,863,873,874,880,881,882,883,884,885,888,905,910,921,926,
        927,928,929,941,942,943,945,952,953,958,968,969,970,971,972,973,974,1001,1002,1014,
        1018,1021,1022,1024,1026,1035,1045,1046,1048,1049,1050,1052,1057,1069,1070,1089,1090,
        1094,1115,1116,1122,1123,1124,1125,1126,1127,1128,1134,1135,1145,1160,1164,1170,1171,
        1192,1193,1211,1212,1218,1219,1222,1224,1226,1232,1233,1235,1250,1252,1258,1267,1273,
        1274,1275,1289,1297,1298,1302,1306,1308,1309,1317,1318,1331,1346,1347,1351,1356,1357,
        1376,1377,1378,1386,1387,1390,1402,1403,1410,1412,1414,1423,1424,1425,1429,1431,1432,
        1448,1449,1460,1468,1488,1489,1497,1502,1505,1507,1510,1518,1522,1524,1531,1532,1533,
        1564,1565,1568,1570,1571,1575,1576,1577,1578,1587,1590,1595,1596,1597,1599,1600,1636,
        1639,1640,1643,1645,1653,1655,1662,1664,1666,1683,1723,1724,1725,1727,1745,1751,1752,
        1755,1756,1757,1765,1769,1773,1776,1803,1813,1865,1866,1871,1880,1885,1892,1897,1906,
        1908,1910,1911,1912,1938,1939,1940,1947,1949,1952,1953,1958,1959,1960,1961,1962,1963,
        1964,1970,2011,2012,2014,2015,2016,2017,2018,2038,2041,2045,2052,2054
    ]); // unrated contests (this list was generated by calling the api 2000 times)

    function overrideStyleAttribute(elm, prop, value) {
        // elm.setAttribute("style", elm.getAttribute("style") + `; ${prop}: ${value} !important; `);
        let style = elm.getAttribute("style") || "";

        let styleObj = style.split(';').reduce((acc, styleProp) => {
            let [key,val] = styleProp.split(':').map(item => item.trim());
            if (key) {
                acc[key] = val;
            }
            return acc;
        }, {});

        styleObj[prop] = `${value} !important`;

        let newStyle = Object.entries(styleObj).map(([key, val]) => `${key}: ${val}`).join('; ');

        elm.setAttribute("style", newStyle);
    }

    // check if master
    function isMasterRank(element) {

        if (element.hasAttribute('title')) {
            if (element.title.toLowerCase().includes("master") && !element.title.toLowerCase().includes("international")) {
                return true;
            } else {
                return false;
            }
        }
        const textContent = element.textContent.trim().toLowerCase();
        if (textContent.includes('master') && !textContent.includes('international')) {
            return true;
        }
        if (textContent.trim() === 'm') {
            return true;
        }
        // rating
        if (!isNaN(parseInt(element.textContent.trim())) && parseInt(element.textContent.trim()) >= 2100 && parseInt(element.textContent.trim()) <= 2299) {
            return true;
        }

        return false;
    }

    // check if igm
    function isIGMRank(element) {

        if (element.hasAttribute('title')) {
            if (element.title.toLowerCase().includes("grandmaster") && element.title.toLowerCase().includes("international")) {
                return true;
            } else {
                return false;
            }
        }
        const textContent = element.textContent.trim().toLowerCase();
        if (textContent.includes('grandmaster') && textContent.includes('international')) {
            return true;
        }
        if (textContent.trim() === "igm") {
            return true;
        }
        // <span> with rating
        if (!isNaN(parseInt(element.textContent.trim())) && parseInt(element.textContent.trim()) >= 2600 && parseInt(element.textContent.trim()) <= 2999) {
            return true;
        }

        return false;
    }

    function changeOrange(elm) {
        if (isMasterRank(elm)) {
            elm.classList.add('user-worseorange');
        }
    }

    function changeRed(elm) {
        if (isIGMRank(elm)) {
            elm.classList.add('user-betterred');
        }
    }

    function processNewElements(nodes) {
        nodes.forEach(node => {
            if (node.nodeType === 1) {
                if (node.matches('.user-orange')) {
                    changeOrange(node);
                    // setTimeout(() => changeOrange(node),0);
                }
                if (node.matches('.user-red')) {
                    changeRed(node);
                    // setTimeout(() => changeRed(node),0);
                }
                node.querySelectorAll('.user-orange').forEach(childNode => {
                    changeOrange(childNode);
                    // setTimeout(() => changeOrange(childNode), 0);
                });
                node.querySelectorAll('.user-red').forEach(childNode => {
                    changeRed(childNode);
                    // setTimeout(() => changeRed(childNode), 0);
                });
            }
        });
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function getUserRating(username) {
        try {
            const url = `https://codeforces.com/api/user.rating?handle=${username}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.status !== 'OK')throw new Error(data.comment);
            return (data.result.length === 0) ? 0 : data.result[data.result.length-1].newRating;
        } catch (error) {
            console.error(`error fetching user rating: ${error.message}`);
            await delay(1000);
        }
    }

    function isSkipped(contest, username) {
        if (contest[0].contestId == 1965 && username == "ksun48") {
            return false; // exception
        }
        const verdicts = {};
        for (const elm of contest) {
            if (!verdicts[elm.verdict])verdicts[elm.verdict] = 0;
            ++verdicts[elm.verdict];
            if (elm.verdict === 'OK' || elm.verdict === 'PARTIAL') {
                return false;
            }
            /* if (entry.verdict === 'SKIPPED') {
                console.log(`https://codeforces.com/submissions/${username}/contest/${entry.contestId}`)
            } */
        };
        // console.log(verdicts);
        return !!verdicts.SKIPPED;
    }

    function groupSubmissions(submissions) {
        const contestMap = new Map();

        submissions.forEach(sub => {
            if (sub.author.participantType === 'CONTESTANT' || sub.author.participantType === 'OUT_OF_COMPETITION') {
                const id = sub.contestId;
                if (!contestMap.has(id)) {
                    contestMap.set(id, []);
                }
                contestMap.get(id).push(sub);
            }
        });

        const results = Array.from(contestMap.entries())
        .sort(([, a], [, b]) => b[0].id - a[0].id)
        .map(([, submissions]) => submissions);

        return results;
    }

    let logMessage;

    async function getContests(username) {
        let contests = [];
        let fetched = 0;
        const seenContestIds = new Set();
        let count = START_CHECK;
        let prevCount = 0;
        let ttlcheck = 0;
        while (true) {
            try {
                let from = fetched+1;
                const url = `https://codeforces.com/api/user.status?handle=${username}&from=${from}&count=${count}`;
                const response = await fetch(url);
                const data = await response.json();
                if (data.status !== 'OK')throw new Error(data.comment);
                // console.log(data.result.length);
                if (!data.result.length)break;
                fetched += data.result.length;
                const newContests = groupSubmissions(data.result);
                let breakNow = false;
                for (const newContest of newContests) {
                    const newContestId = newContest[0].contestId;
                    if (unratedContests.has(newContestId) || newContestId >= 100000) { // gym
                        continue;
                    }
                    if (seenContestIds.has(newContestId)) {
                        // console.log(newContestId);
                        const existingContest = contests.find(c => c[0].contestId === newContestId);
                        existingContest.push(...newContest);
                    } else {
                        // console.log(newContest[0]);
                        // console.log("!"+newContestId);
                        if (contests.length >= NUM_CONTESTS) {
                            breakNow = true;
                            break;
                        }
                        contests.push(newContest);
                        seenContestIds.add(newContestId);
                    }
                };
                if (breakNow) {
                    break;
                }
                count += prevCount;
                prevCount = count;
            } catch (error) {
                console.error(`error fetching submissions: ${error.message}`);
                await delay(1000);
            }
        }
        logMessage = fetched;
        // console.log("fetched "+submissionsFetched);
        return contests;
    }

    async function getSkippedContests(username) {
        /* const userRating = await getUserRating(username);
        if (userRating >= RATING_THRESHOLD) {
            return -1;
        } */

        const contests = await getContests(username);
        const skippedContests = contests.filter(contest => isSkipped(contest, username));
        logMessage = (username+" "+logMessage+" "+skippedContests.length+"/"+contests.length);

        let contestLog = "";
        skippedContests.forEach(contest => {
            contestLog += `https://codeforces.com/submissions/${username}/contest/${contest[0].contestId}\n`;
            // console.log(`https://codeforces.com/submissions/${username}/contest/${contest[0].contestId}`)
        });
        if (contestLog !== "")if (CONSOLE_LOGS)console.log(contestLog);
        return skippedContests;
    }

    function flashFlaggedColor(elm) {
        if (!FLASH_FLAGGED)return;
        const originalColor = getComputedStyle(elm).color;
        let id = null;

        function toggleColor() {
            overrideStyleAttribute(elm, "color", elm.style.color === 'crimson' ? originalColor : 'crimson');
        }

        function startFlashing() {
            clearInterval(id);
            id = setInterval(toggleColor, FLASH_WINDOW);
        }
        toggleColor();
        setTimeout(startFlashing, FLASH_WINDOW);
    }

    function isGradient(elm) {
        // console.log(elm.textContent);
        const styles = window.getComputedStyle(elm);
        // console.log(styles.getPropertyValue('-webkit-text-fill-color'));
        return styles.getPropertyValue('-webkit-text-fill-color') === 'rgba(0, 0, 0, 0)';
    }

    function isDarkMode() {
        const bgColor = window.getComputedStyle(document.body).backgroundColor;
        let lum = parseInt(bgColor.match(/\d+/)[0], 10);
        if (lum < 128) {
            if (CONSOLE_LOGS)console.log("detected dark theme");
            return 1;
        } else {
            if (CONSOLE_LOGS)console.log("detected light theme");
            return 0;
        }
    } // this will hopefully adjust the flash text shadow according to the background

    let isDark = -1;

    function genShadow(orig, rgb, opac) {
        if (isDark) {
            return `${orig}
                0 0 5px rgba(${rgb}, ${opac}),
                0 0 10px rgba(${rgb}, ${opac}),
                0 0 15px rgba(${rgb}, ${opac})
                `;
        } else {
            return `${orig}
                0 0 7.5px rgba(${rgb}, ${opac}),
                0 0 15px rgba(${rgb}, ${opac})
                `;
        }
    }

    function flashLegit(elm) {
        if (!FLASH_CHECKED)return;
        const originalColor = getComputedStyle(elm).color;
        const originalShadow = getComputedStyle(elm).textShadow === 'none' ? '' : getComputedStyle(elm).textShadow;
        const originalShadowComma = originalShadow === '' ? '' : originalShadow+',';
        const rgbValues = isGradient(elm) ? '255, 255, 255' : originalColor.match(/\d+/g).slice(0, 3).join(', ');
        let opacity = 1;
        overrideStyleAttribute(elm,"text-shadow",genShadow(originalShadowComma,rgbValues,opacity));
        let interval = setInterval(() => {
            if (opacity <= 0) {
                overrideStyleAttribute(elm,"text-shadow",`${originalShadow}`);
                clearInterval(interval);
            } else {
                opacity -= 0.1;
                overrideStyleAttribute(elm,"text-shadow",genShadow(originalShadowComma,rgbValues,opacity));
            }
        }, 50);
    }

    function flashFlagged(elm) {
        if (!FLASH_CHECKED)return;
        const originalColor = getComputedStyle(elm).color;
        const originalShadow = getComputedStyle(elm).textShadow === 'none' ? '' : getComputedStyle(elm).textShadow;
        const originalShadowComma = originalShadow === '' ? '' : originalShadow+',';
        const rgbValues = '220, 20, 60';
        let opacity = 1;
        overrideStyleAttribute(elm,"text-shadow",genShadow(originalShadowComma,rgbValues,opacity));
        let interval = setInterval(() => {
            if (opacity <= 0) {
                overrideStyleAttribute(elm,"text-shadow",`${originalShadow}`);
                clearInterval(interval);
            } else {
                opacity -= 0.1;
                overrideStyleAttribute(elm,"text-shadow",genShadow(originalShadowComma,rgbValues,opacity));
            }
        }, 50);
    }

    const highSuspects = ['PinkieRabbit','Z-301',
                          'hhhgjyismine','RNS_KSR','lmqzzz','Rainbow_qwq','0tesmem','Miko35',
                          'wenkaijie','aaa12321','NKheyuxiang','Diana',
                          'Hevix','FengLing','stoDiwanulorz','Sai_t','YCKC_LCJ','plagues','PvPro','tevenqwq','251Sec','siiuuuuuuu']; // manually checked
    const detectedSuspects = new Set();
    const allUsers = new Set();
    let firstCheck = true;
    async function startFlagging() {
        const selectedElms = document.querySelectorAll('.rated-user[href*="/profile/"]');
        const excludedClasses = [];
        if (!scanAdmin)excludedClasses.push('user-admin');
        if (!scan4000)excludedClasses.push('user-4000');
        if (!scanLGM)excludedClasses.push('user-legendary');
        if (!scanIGM)excludedClasses.push('user-pink');
        if (!scanGM)excludedClasses.push('user-red');
        if (!scanIM)excludedClasses.push('user-orange');
        if (!scanM)excludedClasses.push('user-yellow');
        if (!scanCM)excludedClasses.push('user-violet');
        if (!scanBlue)excludedClasses.push('user-blue');
        if (!scanCyan)excludedClasses.push('user-cyan');
        if (!scanGreen)excludedClasses.push('user-green');
        if (!scanGrey)excludedClasses.push('user-gray');
        if (!scanUnrated)excludedClasses.push('user-black');
        // const excludedClasses = ['user-4000','user-legendary','user-pink','user-red','user-orange'];
        // const excludedClasses = ['user-4000','user-legendary','user-pink','user-red','user-orange','user-yellow','user-violet','user-blue','user-cyan'];
        const checkClasses = [];
        const elms = Array.from(selectedElms).filter(elm => !elm.closest('.user-contests-table') && !elm.closest('#sidebar'));
        for (const elm of elms) {
            const username = elm.getAttribute('href').split('/profile/')[1];
            if (SHOW_HOURGLASS)elm.textContent += '⏳';
            let isFlagged;
            let flagCheck = true;
            logMessage = "";
            if (username.length < 3 || username.length > 24) {
                if (CONSOLE_LOGS)console.log("trying to check \""+username+"\" ? preposterous");
                isFlagged = false;
            } else {
                isFlagged = detectedSuspects.has(username);
                let isExcluded = excludedClasses.some(className => elm.classList.contains(className));
                if (excludedClasses.includes('user-yellow')) {
                    isExcluded |= elm.classList.contains('user-worseorange');
                } else {
                    isExcluded &= !elm.classList.contains('user-worseorange');
                }
                if (excludedClasses.includes('user-pink')) {
                    isExcluded |= elm.classList.contains('user-betterred');
                } else {
                    isExcluded &= !elm.classList.contains('user-betterred');
                }
                if (isExcluded) {
                    if (!highSuspects.includes(username)) {
                        if (!firstCheck)await delay(50);
                        if (SHOW_HOURGLASS)elm.textContent = elm.textContent.replace('⏳', '');
                        flashLegit(elm);
                        if (CONSOLE_LOGS)console.log(`⏩ ${username};`);
                        flagCheck = false;
                    }
                }
                /* this used to be for if you wanted to check only users below a certain rating
                else if (checkClasses.some(className => elm.classList.contains(className))) {
                    if (!highSuspects.includes(username)) {
                        const userRating = await getUserRating(username);
                        if (userRating >= RATING_THRESHOLD) {
                            if (!firstCheck)await delay(50);
                            if (SHOW_HOURGLASS)elm.textContent = elm.textContent.replace('⏳', '');
                            flashLegit(elm);
                            if (CONSOLE_LOGS)console.log(`▶️ ${username};`);
                            flagCheck = false;
                        }
                    }
                } */
                firstCheck = false;
                if (!allUsers.has(username) && flagCheck) {
                    const skippedContests = await getSkippedContests(username);
                    if (skippedContests.length > 0) {
                        isFlagged = true;
                        detectedSuspects.add(username);
                    }
                    allUsers.add(username);
                } else if (flagCheck) {
                    await delay(50);
                }
            }
            if (logMessage.length) { // first occurence
                if (SHOW_HOURGLASS)elm.textContent = elm.textContent.replace('⏳', '');
                if (isFlagged) {
                    elm.title = `Suspect ${username}`;
                    if (SHOW_WARNING)elm.textContent += '⚠️';
                    if (CONSOLE_LOGS)console.log("⚠️ found ⚠️");
                    flashFlagged(elm);
                    flashFlaggedColor(elm);
                    if (CONSOLE_LOGS)console.log("❌ "+logMessage);
                } else {
                    flashLegit(elm);
                    if (CONSOLE_LOGS)console.log("✔️ "+logMessage);
                }
            } else if (flagCheck) { // any other occurence
                if (SHOW_HOURGLASS)elm.textContent = elm.textContent.replace('⏳', '');
                if (isFlagged) {
                    elm.title = `Suspect ${username}`;
                    if (SHOW_WARNING)elm.textContent += '⚠️';
                    flashFlagged(elm);
                    flashFlaggedColor(elm);
                    if (CONSOLE_LOGS)console.log("❌ "+username);
                } else {
                    flashLegit(elm);
                    if (CONSOLE_LOGS)console.log("✔️ "+username);
                }
            }
        }
        if (CONSOLE_LOGS)console.log("checked "+allUsers.size+", suspected "+detectedSuspects.size);
        if (CONSOLE_LOGS)console.log([...detectedSuspects].join('\n'));
    }

    var observer = new MutationObserver(function (mutationsList) {
        mutationsList.forEach(function (mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (mutation.target.classList.contains('user-orange')) {
                    changeOrange(mutation.target);
                    // setTimeout(() => changeOrange(mutation.target), 0);
                }
                if (mutation.target.classList.contains('user-red')) {
                    changeRed(mutation.target);
                    // setTimeout(() => changeRed(mutation.target), 0);
                }
            }
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                processNewElements(mutation.addedNodes);
            }
        });
    });

    let startedFlagging = false;
    document.addEventListener('DOMContentLoaded', async function() {
        isDark = isDarkMode();
        document.querySelectorAll('.user-orange').forEach(function (elm) {
            changeOrange(elm);
            // setTimeout(() => applyClassChanges(elm), 0);
        });
        document.querySelectorAll('.user-red').forEach(function (elm) {
            changeRed(elm);
            // setTimeout(() => applyClassChanges(elm), 0);
        });

        observer.observe(document.body, { attributes: true, childList: true, subtree: true });

        if (!startedFlagging) {
            await startFlagging();
            startedFlagging = true;
        }
    });
})();