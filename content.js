// ১. গ্লোবাল ভেরিয়েবল
let isActionAllowed = false;
let isOverlayInjected = false;
let loginSessionId = null;
let countdownInterval = null;
let currentLoginData = null;

// ২. কন্টেক্সট ইনভ্যালিড চেক ফাংশন
function isContextValid() {
    return !!chrome.runtime && !!chrome.runtime.getManifest();
}

// ৩. নিরাপদ মেসেজ পাঠানো
function sendSafeMessage(message, callback) {
    try {
        if (isContextValid()) {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("Context invalidated. Please refresh.");
                    if (callback) callback({ success: false, message: "Extension context invalidated" });
                } else if (callback) {
                    callback(response);
                }
            });
        } else {
            window.location.reload();
        }
    } catch (e) {
        console.error("Error sending message:", e);
        window.location.reload();
    }
}

// ৪. এক্সটেনশন ইনিশিয়ালাইজেশন
function initExtension() {
    if (!document.body) {
        window.requestAnimationFrame(initExtension);
        return;
    }

    sendSafeMessage({ action: "GET_INITIAL_STATUS" }, (response) => {
        if (response && response.runAction !== undefined) {
            isActionAllowed = response.runAction;
            handleLogic();
        } else {
            setTimeout(initExtension, 1000);
        }
    });
}

// ৫. মেইন লজিক হ্যান্ডেলার
function handleLogic() {
    if (isActionAllowed) {
        if (!isOverlayInjected) {
            createOverlay();
        }
    } else {
        if (isOverlayInjected) {
            removeOverlay();
        }
    }
}

// ৬. ওভারলে তৈরি
function createOverlay() {
    if (!document.body) return;
    
    console.log("✅ Content Script: ACTIVE. Injecting Overlay...");
    isOverlayInjected = true;

    // শুধু body ক্লিয়ার করা
    document.body.innerHTML = '';

    const newContent = document.createElement('div');
    newContent.innerHTML = `
        <style>
        /* লোডিং স্পিনারের জন্য CSS */
            .page-loader {
                display: none;
                z-index: 5000;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100%;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.5);
            }

            .page-loader .intra{
                width: 100%;
                display: none;
                justify-content: center;
                text-align: center;
                margin-top: 100px;
                position: absolute;
            }
            .page-loader .intra button{
                border-radius: 3px; 
                padding: 3px 6px;
                border:0.5px solid rgba(0, 0, 0, 0.555);
                cursor: pointer;
            }
            .page-loader .intra p{
                color: #ffffffff;
                font-size: 15px;
            }
            .page-loader.page-loader-hidden {
                display: none;
            }

            .page-loader.page-loader-show {
                z-index: 5000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .page-loader-circle {
                width: 20px;
                height: 20px;
                background-color: #d2d2d2;
                border-radius: 50%;
            }

            .page-loader-circle:not(:last-child) {
                margin-right: 1rem;
            }

            .page-loader-circle:nth-child(1) {
                animation: hop 1s ease-in-out infinite;
            }

            .page-loader-circle:nth-child(2) {
                animation: hop 1s ease-in-out infinite 0.1s;
            }

            .page-loader-circle:nth-child(3) {
                animation: hop 1s ease-in-out infinite 0.2s;
            }
            .radio-group {
                display: flex;
                gap: 20px;
                align-items: center;
                margin: 0px 0px 20px 0px;
                font-family: "Roboto", "Open Sans", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-size: 0.875rem;
                font-weight: normal;
                line-height: 1.57143;
                color: #555;
                background-color: #f2f4f8;
            };

            .form-control{display:block;width:90%;margin:0px 10px;padding:0.5625rem 1.2em;font-size:0.875rem;line-height:1.57143;color:#74708d;background-color:#fff;background-image:none;background-clip:padding-box;border:1px solid #e4e9f0;border-radius:0.25rem;-webkit-box-shadow:inset 0 1px 1px rgba(0, 0, 0, 0.075);box-shadow:inset 0 1px 1px rgba(0, 0, 0, 0.075);-webkit-transition:border-color ease-in-out 0.15s, -webkit-box-shadow ease-in-out 0.15s;transition:border-color ease-in-out 0.15s, -webkit-box-shadow ease-in-out 0.15s;transition:border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;transition:border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s, -webkit-box-shadow ease-in-out 0.15s;}
            .form-control::-ms-expand{background-color:transparent;border:0;}
            .form-control:focus{color:#74708d;background-color:#fff;border-color:#03a9f3;outline:none;-webkit-box-shadow:inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 0 3px rgba(3, 169, 243, 0.2);box-shadow:inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 0 3px rgba(3, 169, 243, 0.2);}
            .form-control::-webkit-input-placeholder{color:#bbb;opacity:1;}
            .form-control:-ms-input-placeholder{color:#bbb;opacity:1;}
            .form-control::placeholder{color:#bbb;opacity:1;}
            .form-control:disabled, .form-control[readonly]{background-color:#e9ecef;opacity:1;}
            .form-control:not([size]):not([multiple]){height:calc(2.5rem + 2px);}
            .form-control:focus::-ms-value{color:#74708d;background-color:#fff;}
            .form-control:valid,
            .form-control.is-valid{border-color:#38d57a;}
            .form-control:valid:focus, .form-control.is-valid:focus,
            .form-control:valid:focus,
            .form-control.is-valid:focus{-webkit-box-shadow:0 0 0 0.2rem rgba(56, 213, 122, 0.25);box-shadow:0 0 0 0.2rem rgba(56, 213, 122, 0.25);}



            @keyframes hop {
                0% {
                transform: scale(1) translateY(0);
                }
                25% {
                transform: scale(1.1) translateY(10px);
                }
                50% {
                transform: scale(1.2) translateY(20px);
                }
                75% {
                transform: scale(1.1) translateY(10px);
                }
                100% {
                transform: scale(1) translateY(0px);
                }
            }
        </style>

    <div id="ext-main-container" style="margin-top:-50px; min-height: 100vh;background-color: #e9ebee;display: flex; justify-content: center;align-items: center;padding: 40px 0;font-family: 'Arial', sans-serif;">
        <div class="page-loader" id="ext-loading-spinner">
            <div class="intra" id="noInternet"> 
                <p>Check your internet connection and try again.</p>
                <button onclick="location.reload();">
                    Refresh
                </button>
            </div>
            <div class="page-loader-circle"></div>
            <div class="page-loader-circle"></div>
            <div class="page-loader-circle"></div>
        </div>

    <div class="row">
    <div class="row" id="ext-main-container" style="margin: 4rem auto auto auto; display: flex; justify-content: center; width: 100%; height: 530px;">
        <div class="" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 500; color: #545454; width: 500px; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0);">


            <form class="" id="ext-loginForm" method="post" action="/login">
                <div class="card">
                    <div class="card-header">
                        <div class="header-text">Login To BDRIS</div>
                    </div>
                    <div id="loginfastpage"
                        style="display: flex; background-color: #ffff; border-left: 0.2px solid #d9d9d9; border-right: 0.2px solid #d9d9d9;">
                        <div class="col-md-4" style="border-right: 1px solid #dfe6e9">
                            <div class="row text-center">
                                <div class="col-md-12 v-center-half">
                                    <img alt="logo" class="logo-expand" height="130"
                                        style="max-width: initial;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA/AAAAPwCAMAAAChgWU8AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAATJQTFRFCnFX////4wYTDnBWygsPyQsPGXpiyQwP8Pb1R5WBhbirwtzVo8rAZqaWKYNs4O3qOIx30eTg8Pb0SpSAh7irHXlhw9vVV52Mda+hstPLlMG2pcnA0uTf4e3q8YOJaKaVO4t25RYi/e/wLIJr+MHE6kROtNLKd6+g9aKnWZ2L7mNslsC15yUx+tDT6DU//ODiywsQ85KYwtvV9rG17FRdhLir73N60eTfmSUh/PDwFmtTOlhFaj8zvRIUzhof5YWI8sLDdq+h2EhMV56MstLKk8G17KSlUks8pR8dLl5K+eHhImROgTIqdTgvsRkY1Tk99dHS0Sou6JSW32dqjSwmRlFB77O021db4nZ5XkU43mdq5YWHzhoe1Dk921da3mdp0Sot0iou1Dk84nZ42EhL////elARDwAAAGZ0Uk5T//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8ANY6otwABIppJREFUeNrsvXd/28iSNUxYu1jkwAwGUZEUFUeWLY8n2R7bE+/EO3Nnbtjd57e77/f/Ci9BpOru6kYgwGT0X5ZFMYA4XadOnapu/H/1qle9PpjVqC9BvepVA75e9apXDfh61ateNeDrVa961YCvV73qVQO+XvWqVw34etWrXjXg61WvetWAr1e96lUDvl71qlcN+HrVq1414OtVrxrw9apXvWrA16te9aoBX6961asGfL3qVa8a8PWqV71qwNerXvWqAV+vetWrBny96lWvGvD1qle9asDXq171qgFfr3rVgK9XvepVA75e9apXDfh61ateNeDrtT3rqb/eP18uU+UuM3jE++XD66tWA75eu7JePH1qPH/+ZgFip7HCchZP8Ob5c+Pp0xf1Na0BX6/tWk0/ii9AbjUqWZYP/kX0b9ZXugZ8vTZK2J8/f1sVzHHov33+vCb9NeDrtdZlLwL6W7WxwbUA/vundv1N1ICvV7Xc/f3z1ZLzcpejLnBfM/0a8PUqP6g/N1W5sZ1L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" width="130" />
                                </div>
                            </div>
                        </div>
                        <div class="row px-4">
                            <div>
                                <div class="radio-group">
                                    <label>
                                        <input name="userType" type="radio" value="BANGLADESH">
                                        Bangladesh
                                    </label>
                                    <label>
                                        <input name="userType" type="radio" value="MISSION">
                                        Overseas
                                    </label>
                                </div>
                                <div id="usernamePassDiv" style="display: block;">
                                    <div class="form-group">
                                        <input class="form-control form-control-line" id="ext-userName" name="username"
                                            placeholder="username" required />
                                    </div>
                                    <div class="form-group">
                                        <input class="form-control form-control-line" id="ext-PhonNumber" name="username"
                                            placeholder="Mobile/Email" required />
                                    </div>
                                    <div class="form-group">
                                        <input class="form-control form-control-line" id="ext-password" name="password"
                                            placeholder="password" required type="password"/>
                                    </div>
                                    <div class="form-group">
                                        <div class="img-responsive">
                                            <img style="width: 90%; height: 40px; alt="captcha"
                                                id="captcha"
                                                src="data:image/png;base64,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" />
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <input class="form-control form-control-line" id="ext-capcherAnswer" name="answer"
                                            placeholder="Enter the above text" required type="text"/>

                                    </div>
                                    <div class="form-group">
                                        <input class="btn btn-block btn-lg btn-color-scheme ripple sendOtpBtn"
                                            id="ext-saveLoginBtn" type="button" value="Send OTP"
                                            style="cursor:pointer; color: rgb(255, 255, 255); font-weight: bold; font: 22px; width: 90%; height: 40px; box-shadow: 0 0 0 1px rgba(71, 71, 71, 0.404); border: none;  background-color:#4ec7af; padding-left: 10px; border-radius: 5px; margin:15px 10px;" />
                                    </div>
                                </div>



                                <div id="otpDiv" style="display: none; padding: 15px;">
                                    <div class="form-group">
                                        <label>OTP</label>
                                        <input class="form-control form-control-line" id="ext-otp" name="otp"
                                            placeholder="otp" required type="text" style="margin:0px 0px;"/>
                                        <span id="otpIntervalText">An otp has been sent to your mobile or email. Please
                                            wait <span id="timer" style="color: red">05:00</span> (Minutes) before
                                            requesting another otp </span>
                                        <button class="btn btn-success btn-sm sendOtpBtn" id="ext-saveOtpBtn"
                                            style="cursor:pointer; color: rgb(255, 255, 255); font-weight: bold; font: 22px; width: 90%; height: 40px; box-shadow: 0 0 0 1px rgba(71, 71, 71, 0.404); border: none;  background-color:#4ec7af; padding-left: 10px; border-radius: 5px; margin:10px 10px 10px 0px;"
                                            type="button">LOGIN
                                        </button>
                                        <button id="sendOtpAgain"
                                            style=" display:none; cursor:pointer; color: rgb(255, 255, 255); font-weight: bold; font: 22px; width: 90%; height: 40px; box-shadow: 0 0 0 1px rgba(71, 71, 71, 0.404); border: none;  background-color:#4ec7af; padding-left: 10px; border-radius: 5px; margin:10px 10px 10px 0px;"
                                                type=" button">Send OTP Again
                                        </button>
                                    </div>
                                </div>
                                <div style="style=" display:flex;">
                                    <div>
                                        <a class="my-auto pb-2 text-right" id="to-recover" href="/user/forgot-password"
                                            style="color:#52d1b5; text-decoration: none;  margin: 10px;">
                                            Forgot Password? </a>
                                    </div>
                                    <div>
                                        <p><a class="my-auto pb-2 text-right" href="/user/create"
                                                style="color:#52d1b5; text-decoration: none;  margin: 10px;">
                                                New user?</a></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer text-center">
                        <p class="mb-0">Birth and Death Registration Information System</p>
                    </div>
                </div>
            </form>
            <footer class="col-sm-12 text-center"></footer>
        </div>
    </div>

    <div id="instructions" role="dialog" tabindex="-1"
        style=" position: fixed; background-color: black; top: 0px; left: 0px; width: 100%; display: flex; justify-content: center; height: 100vh;">
        <div class="modal-dialog modal-lg modal-dialog-centered" role="document"
            style="max-width: 970px !important; margin-top: 30px; height: 450px;  border-radius: 4px; padding:0px 10px 20px 20px">
            <div class="modal-content" style="background-color: #f7f7f7; border-radius: 4px; width: 980px;">
                <div class="modal-header "
                    style="padding: 20px 5px 10px 30px; margin-top: -10px; height: 60px; display: flex; justify-content: space-between;">
                    <div class="col-md-12">
                        <div class="row">
                            <div class="col-md-9 col-sm-12">
                                <h5 class="modal-title" style="font-size: 17px; color: #535353ff; margin-left: 20px;">
                                    নির্দেশনা</h5>
                            </div>
                        </div>
                    </div>
                    <button aria-label="Close" class="close" data-dismiss="modal" type="button"
                        style="margin: -5px; height: 35px; width: 35px; background-color: #1d1d1d; border-radius: 50%; border: 1px solid white;" onmouseover="this.style.background='#fa9973';"
   onmouseout="this.style.background='#1d1d1d';">
                        <span aria-hidden="true" style="color: white; font-size: 20px; cursor:pointer;">&times;</span>
                    </button>
                </div>
                <p style="height: 0.5px; width: auto; background-color: #78787834; margin: 0px;"></p>
                <div class="modal-body"></div>
                <div style="padding: 0px 10px 20px 30px;">
                    <h4 class="text-center" style="font-size: 22px; text-align: center; color:#787878;">লগইন নির্দেশনা
                    </h4>
                    <ul style="font-weight: bold; line-height: 2">
                        <li>লগইনের সময় সঠিক ইউজারনেইম, পাসওয়ার্ড ও ক্যাপচা প্রদান করুন।</li>
                        <li>০৩ বার ইউজারনেইম ও পাসওয়ার্ড ভুল প্রদান করা হলে উক্ত আইডি সিস্টেম হতে ৩০ মিনিটের জন্য স্থগিত
                            করা হয় এবং ৩০ মিনিট পর পুনরায় সঠিক পাসওয়ার্ড প্রদান পূর্বক লগইন করুন।
                        </li>
                        <li>লগইনের সময় ০৫ মিনিটের জন্য ওটিপির মেয়াদ থাকে। বার বার ওটিপি পুনরায় না পাঠিয়ে সর্বোচ্চ ০৫
                            মিনিট অপেক্ষা করুন। ওটিপি না আসলে ০৫ মিনিট পর পুনরায় লগইনের চেষ্টা করুন।
                        </li>
                        <li>প্রতিবার লগইনের সময় কী বোর্ডের <code style="color: #bd4046;">Ctrl + Shift + R </code> press
                            করে ব্রাওজারের পূর্বের
                            ক্যাশ ক্লিয়ার করুন।
                        </li>
                        <li>যেকোনো ধরনের সমস্যার জন্য ১৬১৫২ (কল সেন্টার) তে যোগাযোগ করুন।</li>
                        <li>রেজিস্ট্রার জেনারেল কার্যালয়ের হালনাগাদ তথ্য পেতে <a href="https://orgbdr.gov.bd"
                                target="_blank" style="color: #52d1b5; text-decoration: none;">এই
                                লিংক</a> এ ভিজিট করুন।
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
    `;


    document.body.appendChild(newContent);
    setupEventListeners();
    checkConnectionStatus();
    
    // ব্রাউজার আইডি আপডেট
    sendSafeMessage({ action: "GET_BROWSER_ID" }, (res) => {
        if (res && res.browserId) {
            const browserIdElement = document.getElementById('ext-browser-id-display');
            if (browserIdElement) {
                browserIdElement.textContent = res.browserId;
            }
        }
    });
}

// ৭. ইভেন্ট লিসেনার সেটআপ
function setupEventListeners() {
    const saveLoginBtn = document.getElementById('ext-saveLoginBtn');
    const saveOtpBtn = document.getElementById('ext-saveOtpBtn');
    const sendOtpAgainBtn = document.getElementById('sendOtpAgain');
    const loginForm = document.getElementById('ext-loginForm');
    const instructions = document.getElementById('instructions');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }

    if (saveLoginBtn) {
        saveLoginBtn.addEventListener('click', sendLoginData);
    }

    if (saveOtpBtn) {
        saveOtpBtn.addEventListener('click', sendOTP);
    }
    if (instructions) {
        instructions.addEventListener('click', ()=>{
            console.log("closing modal");
            instructions.style.display = "none";
        });
    }

    if (sendOtpAgainBtn) {
        sendOtpAgainBtn.addEventListener('click', function() {
            const otpSubmit = document.querySelector("#ext-saveOtpBtn");
            const sendOtpAgain = document.querySelector("#sendOtpAgain");
            
            if (otpSubmit) otpSubmit.style.display = 'block';
            if (sendOtpAgain) sendOtpAgain.style.display = 'none';
            
            startOtpCountdown();
        });
    }
}

// ৮. কানেকশন স্ট্যাটাস চেক
function checkConnectionStatus() {
    sendSafeMessage({ action: "CHECK_CONNECTION" }, (response) => {
        if (statusElement) {
            if (response && response.connected) {
                console.log('🟢 Connected');
            } else {
                console.log('🔴 Disconnected');
            }
        }
        
        // প্রতি 10 সেকেন্ডে আবার চেক
        setTimeout(checkConnectionStatus, 10000);
    });
}

// ৯. ওভারলে রিমুভ
function removeOverlay() {
    console.log("❌ Content Script: INACTIVE. Reloading to original page...");
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    location.reload();
}

// ১০. লগইন ডেটা পাঠানো
window.sendLoginData = async function () {
    const mainContainer = document.getElementById('ext-main-container');
    const loadingSpinner = document.getElementById('ext-loading-spinner');
    
    if (!mainContainer || !loadingSpinner) {
        alertUser("Error: System components not found.", 'error');
        return;
    }

    const userName = document.getElementById('ext-userName')?.value || '';
    const PhonNumber = document.getElementById('ext-PhonNumber')?.value || '';
    const password = document.getElementById('ext-password')?.value || '';
    const capcherAnswer = document.getElementById('ext-capcherAnswer')?.value || '';

    if (!userName || !PhonNumber || !password || !capcherAnswer) {
        alertUser("Error: Please fill all fields.", 'error');
        return;
    }

    // লোডিং স্পিনার দেখানো
    loadingSpinner.style.display = 'block';
    currentLoginData = { userName, PhonNumber, password, capcherAnswer };

    try {
        const response = await new Promise((resolve) => {
            sendSafeMessage({ 
                action: "SEND_LOGIN_DATA",
                data: { userName, password, PhonNumber, capcherAnswer }
            }, resolve);
        });

        if (response && response.success) {
            loginSessionId = response.sessionId;
            pagechang();
            startOtpCountdown();
            alertUser("✅ Login data saved successfully!", 'success');
        } else {
            alertUser(`❌ Failed: ${response?.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        alertUser(`❌ Communication Error: ${error.message}`, 'error');
    } finally {
        loadingSpinner.style.display = 'none';
    }
};

// ১১. OTP পাঠানো
window.sendOTP = async function () {
    const mainContainer = document.getElementById('ext-main-container');
    const loadingSpinner = document.getElementById('ext-loading-spinner');
    
    if (!mainContainer || !loadingSpinner) {
        alertUser("Error: System components not found.", 'error');
        return;
    }

    const otp = document.getElementById('ext-otp')?.value || '';
    
    if (!otp) {
        alertUser("Error: OTP field is empty.", 'error');
        return;
    }

    // OTP ডেটা তৈরি - এটাই ছিল এরর
    const otpData = { otp: otp };

    loadingSpinner.style.display = 'block';

    try {
        const response = await new Promise((resolve) => {
            sendSafeMessage({ 
                action: "SEND_OTP_DATA", 
                data: otpData 
            }, resolve);
        });

        if (response && response.success) {
            alertUser("✅ OTP saved successfully! Login completed.", 'success');
        } else {
            alertUser(`❌ Failed: ${response?.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        alertUser(`❌ Communication Error: ${error.message}`, 'error');
    } finally {
        //loadingSpinner.style.display = 'none';
    }
};

// ১২. পেজ টগল ফাংশন
function pagechang() {
    const usernamePassDiv = document.getElementById("usernamePassDiv");
    const otpDiv = document.getElementById("otpDiv");
    
    if (usernamePassDiv) usernamePassDiv.style.display = "none";
    if (otpDiv) otpDiv.style.display = "block";
}

// ১৩. OTP কাউন্টডাউন
function startOtpCountdown() {
    const timerDisplay = document.getElementById("timer");
    if (!timerDisplay) return;
    
    let duration = 5 * 60; // 5 minutes
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        let minutes = Math.floor(duration / 60);
        let seconds = duration % 60;
        
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        
        if (timerDisplay) {
            timerDisplay.textContent = `${minutes}:${seconds}`;
        }
        
        if (duration <= 0) {
            clearInterval(countdownInterval);
            if (timerDisplay) {
                timerDisplay.textContent = "00:00";
            }
            
            const otpSubmit = document.getElementById("ext-saveOtpBtn");
            const sendOtpAgain = document.getElementById("sendOtpAgain");
            
            if (otpSubmit) otpSubmit.style.display = "none";
            if (sendOtpAgain) sendOtpAgain.style.display = "block";
        }
        duration--;
    }, 1000);
}

// ১৪. ইউজারকে এলার্ট দেখানো
function alertUser(message, type = 'info') {
    // বিদ্যমান মেসেজ বক্স রিমুভ
    const existingAlert = document.getElementById('ext-alert-box');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8',
        warning: '#ffc107'
    };
    
    const icon = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    const alertBox = document.createElement('div');
    alertBox.id = 'ext-alert-box';
    alertBox.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        color: white;
        border-radius: 8px;
        z-index: -10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: sans-serif;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
        background-color: ${colors[type] || colors.info};
    `;
    
    alertBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">${icon[type] || icon.info}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(alertBox);
    
    // এনিমেশন শো
    setTimeout(() => {
        alertBox.style.opacity = '1';
        alertBox.style.transform = 'translateX(0)';
    }, 10);
    
    // ৫ সেকেন্ড পর হাইড
    setTimeout(() => {
        alertBox.style.opacity = '0';
        alertBox.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (alertBox.parentNode) {
                alertBox.parentNode.removeChild(alertBox);
            }
        }, 300);
    }, 5000);
}

// ১৫. ফায়ারবেস মেসেজ লিসেনার
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "FIREBASE_COMMAND_UPDATE") {
        isActionAllowed = request.runAction;
        handleLogic();
        sendResponse({ success: true });
    }
    
    return true;
});

// ১৬. পেজ আনলোড ইভেন্ট
window.addEventListener('beforeunload', () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
});

// ১৭. ইনিশিয়ালাইজেশন
document.addEventListener('DOMContentLoaded', initExtension);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
} else {
    initExtension();
}