window.globalUserPayslips = [];
window.globalEvalDrivers = []; 
window.globalUserEvals = [];
window.globalYardData = [];
window.u_evaluatedDriverIds = [];

window.u_toggleAcceptRulesBtn = function(cb) {
    var btn = document.getElementById('btnAcceptRules');
    if (btn) {
        btn.disabled = !cb.checked;
        if (cb.checked) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-warning', 'text-dark');
        } else {
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-warning', 'text-dark');
        }
    }
};

window.u_declineRules = function() {
    var rulesOverlay = document.getElementById('rulesOverlay');
    if (rulesOverlay) {
        rulesOverlay.style.display = 'none';
    }
    document.body.style.overflow = '';
    
    if(typeof window.logout === 'function') {
        window.logout();
    } else {
        localStorage.removeItem('hr_user_session');
        window.location.reload();
    }
};

window.u_acceptCompanyRules = function() {
    var btn = document.getElementById('btnAcceptRules');
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังดำเนินการ...';
        btn.disabled = true;
    }

    var closeOverlayAndShowContent = function() {
        var overlay = document.getElementById('rulesOverlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
        var content = document.getElementById('userProfileContent');
        if (content) content.style.display = 'flex';
        
        if (window.currentUserData) {
            localStorage.setItem('vkt_rules_accepted_' + window.currentUserData.id, 'true');
            window.currentUserData.rulesAccepted = true;
        }
    };

    if (typeof window.callAPI === 'function' && window.currentUserData) {
        window.callAPI({
            action: 'acceptRules', 
            empId: window.currentUserData.id 
        }).then(function(res) {
            closeOverlayAndShowContent();
        }).catch(function(e) {
            closeOverlayAndShowContent(); 
        });
    } else {
        closeOverlayAndShowContent();
    }
};

window.loadUserData = function() { 
    var userLoadingEl = document.getElementById('userLoading');
    if(userLoadingEl) userLoadingEl.style.display = 'block'; 
    
    var userProfileContentEl = document.getElementById('userProfileContent');
    if(userProfileContentEl) userProfileContentEl.style.display = 'none'; 
    
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    window.callAPI({ 
        action: 'getEmployeesByRole', 
        role: 'User', 
        userId: window.currentUser.empId 
    }).then(function(data){ 
        if(userLoadingEl) userLoadingEl.style.display = 'none'; 
        if (!data || data.length === 0) return; 
        
        var d = data[0]; 
        window.currentUserData = d; 
        
        var headerEl = document.getElementById('userNameHeader');
        if(headerEl) headerEl.innerText = d.name; 
        
        var isAccepted = (d.rulesAccepted === true || d.rulesAccepted === "true" || d.rulesAccepted === "ยอมรับแล้ว");

        if (!isAccepted) {
            localStorage.removeItem('vkt_rules_accepted_' + d.id);
            if(userProfileContentEl) userProfileContentEl.style.display = 'none'; 
            document.body.style.overflow = 'hidden'; 
            
            var rulesOverlay = document.getElementById('rulesOverlay');
            if(rulesOverlay) rulesOverlay.style.display = 'block';
        } else {
            var rulesOverlay = document.getElementById('rulesOverlay');
            if(rulesOverlay) rulesOverlay.style.display = 'none';
            
            document.body.style.overflow = '';
            localStorage.setItem('vkt_rules_accepted_' + d.id, 'true');
            if(userProfileContentEl) userProfileContentEl.style.display = 'flex'; 
        }
        
        window.u_renderUserProfile(d); 
        window.u_renderDocs(d); 

        var pos = d.position || "";
        var isDriver = pos.indexOf('พนักงานขับรถ') > -1 && pos.indexOf('รถร่วม') === -1;
        var isOffice = pos.indexOf('ประสานงาน') > -1 || pos.indexOf('ธุรการ') > -1 || pos.indexOf('ความปลอดภัย') > -1;
        
        var evalContainer = document.getElementById('u_evalTopMenuContainer');
        if (isDriver || isOffice) {
            if(evalContainer) evalContainer.style.display = 'block';
            var evalBtnText = isDriver ? '<i class="bi bi-star-fill me-1"></i> ประเมินออฟฟิศ ' : '<i class="bi bi-star-fill me-1"></i> ประเมินคนขับรถ ';
            var btnOpen = document.getElementById('btnOpenEvalModal');
            if(btnOpen) btnOpen.innerHTML = evalBtnText + '<span id="u_evalStatusBadge" class="badge bg-danger ms-2">ยังไม่ประเมิน</span>';
            
            window.u_checkCurrentMonthEvalStatus(); 
        } else {
            if(evalContainer) evalContainer.style.display = 'none';
        }
        
        window.globalUserWarnings = []; 
        if (d.docs && d.docs.WARNING && d.docs.WARNING.length > 0) { 
            window.globalUserWarnings = d.docs.WARNING.sort(function(a,b) { 
                return new Date(b.date) - new Date(a.date); 
            }); 
        } 
        var warnCountEl = document.getElementById('u_warnCountBadge');
        if(warnCountEl) warnCountEl.innerText = window.globalUserWarnings.length; 
        window.u_renderWarningsList(); 
        
        window.callAPI({ 
            action: 'getAccidentData', 
            role: 'User', 
            empId: window.currentUser.empId 
        }).then(function(accData) { 
            window.globalUserAccidents = accData || []; 
            var accCountEl = document.getElementById('u_accCountBadge');
            if(accCountEl) accCountEl.innerText = window.globalUserAccidents.length; 
            window.u_renderAccidentsList(); 
        }); 

        window.callAPI({ 
            action: 'getUserPayslips', 
            empId: window.currentUser.empId 
        }).then(function(payslipData) {
            window.globalUserPayslips = payslipData || [];
            var payCountEl = document.getElementById('u_payslipCountBadge');
            if(payCountEl) payCountEl.innerText = window.globalUserPayslips.length;
            window.u_renderPayslipsList();
        });

        window.callAPI({
            action: 'getUserEvaluations',
            empId: window.currentUser.empId
        }).then(function(evalData) {
            window.globalUserEvals = evalData || [];
            var evCountEl = document.getElementById('u_evalCountBadge');
            if(evCountEl) evCountEl.innerText = window.globalUserEvals.length;
            window.u_renderEvalsList();
        });

        window.callAPI({ action: 'getSettingsData' }).then(function(res) {
            var lSelect = document.getElementById('u_licType');
            if(lSelect) {
                lSelect.innerHTML = '<option value="">- ประเภทใบขับขี่ -</option>';
                if(res.licenseTypes) {
                    res.licenseTypes.forEach(t => { lSelect.innerHTML += `<option value="${t}">${t}</option>`; });
                }
            }
            var hSelect = document.getElementById('u_ssoHosp');
            if(hSelect) {
                hSelect.innerHTML = '<option value="">- เลือกโรงพยาบาล -</option>';
                if(res.hospitals) {
                    res.hospitals.forEach(h => { hSelect.innerHTML += `<option value="${h}">${h}</option>`; });
                }
            }
        });
    }); 
};

window.u_openEvaluationModal = function() {
    if(!window.currentUserData) return;
    var d = new Date();
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    
    var evalMonthEl = document.getElementById('u_evalMonth');
    if(evalMonthEl) evalMonthEl.value = y + "-" + m;
    
    var posFilterEl = document.getElementById('u_evalPositionFilter');
    if(posFilterEl) posFilterEl.value = 'all';

    var evalModalEl = document.getElementById('u_evaluationModal');
    if(evalModalEl) new bootstrap.Modal(evalModalEl).show();
    
    var drvListEl = document.getElementById('u_evalDriverList');
    if(drvListEl) drvListEl.innerHTML = '<div class="text-center text-muted py-5"><div class="spinner-border text-success"></div><br>กำลังโหลดรายชื่อ...</div>';

    var btnSave = document.getElementById('u_btnSaveEval');
    if(btnSave) { btnSave.disabled = true; btnSave.innerHTML = 'กำลังโหลด...'; }

    window.callAPI({ action: 'getEmployeesToEvaluate', position: window.currentUserData.position }).then(function(drivers) {
        window.globalEvalDrivers = drivers || [];
        
        var posSet = new Set();
        window.globalEvalDrivers.forEach(function(drv) {
            var posList = (drv.position || "").split(',');
            posList.forEach(function(p) {
                var cleanP = p.trim();
                if(cleanP && !cleanP.includes("รถร่วมบริการ")) {
                    posSet.add(cleanP);
                }
            });
        });
        
        var filterSelect = document.getElementById('u_evalPositionFilter');
        if(filterSelect) {
            filterSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
            Array.from(posSet).sort().forEach(function(p) {
                filterSelect.innerHTML += `<option value="${p}">${p}</option>`;
            });
        }

        window.u_checkCurrentMonthEvalStatus();
    });
};

window.u_checkCurrentMonthEvalStatus = function() {
    if(!window.currentUserData) return;
    var d = new Date();
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var currentMonthYear = y + "-" + m;
    
    var evalMonthEl = document.getElementById('u_evalMonth');
    var inputMonth = evalMonthEl ? evalMonthEl.value : currentMonthYear;
    var monthToCheck = inputMonth ? inputMonth : currentMonthYear;

    var drvListEl = document.getElementById('u_evalDriverList');
    if(drvListEl && window.globalEvalDrivers.length > 0) {
        drvListEl.innerHTML = '<div class="text-center text-muted py-5"><div class="spinner-border text-success"></div><br>กำลังตรวจสอบสถานะ...</div>';
    }

    var btnSave = document.getElementById('u_btnSaveEval');
    if(btnSave) { btnSave.disabled = true; btnSave.innerHTML = 'กำลังโหลด...'; }

    window.callAPI({ 
        action: 'checkEvaluationStatus', 
        payload: { 
            monthYear: monthToCheck, 
            evaluatorId: window.currentUserData.id 
        }
    }).then(function(res) {
        window.u_evaluatedDriverIds = (res.evaluatedDriverIds || []).map(String);
        var pendingCount = window.globalEvalDrivers.filter(drv => !window.u_evaluatedDriverIds.includes(String(drv.id))).length;

        var badge = document.getElementById('u_evalStatusBadge');
        if(badge) {
            if (window.globalEvalDrivers.length > 0 && pendingCount === 0) {
                badge.className = "badge bg-success ms-2";
                badge.innerText = "ครบแล้ว";
            } else {
                badge.className = "badge bg-danger ms-2";
                badge.innerText = "เหลือ " + pendingCount + " คน";
            }
        }
        
        if(window.globalEvalDrivers && window.globalEvalDrivers.length > 0) {
            window.u_renderEvalDriversList();
        }
    });
};

window.u_renderEvalDriversList = function() {
    var html = '';
    var btnSave = document.getElementById('u_btnSaveEval');
    
    var pendingDrivers = window.globalEvalDrivers.filter(function(drv) {
        return !window.u_evaluatedDriverIds.includes(String(drv.id));
    });

    if (window.globalEvalDrivers.length === 0) {
         html += '<div class="text-center text-muted py-5">ไม่พบรายชื่อเป้าหมายสำหรับการประเมิน</div>';
         if(btnSave) { btnSave.disabled = true; btnSave.innerHTML = 'บันทึกผลการประเมิน'; }

    } else if (pendingDrivers.length === 0) {
        html += '<div class="alert alert-success bg-success bg-opacity-10 border-success text-success fw-bold small mb-3 text-center py-5 rounded-4"><i class="bi bi-check-circle-fill d-block fs-1 mb-3"></i>เยี่ยมมาก!<br>คุณประเมินพนักงานครบทุกคนแล้วในเดือนนี้ 🎉</div>';
        if(btnSave) { btnSave.disabled = true; btnSave.innerHTML = '<i class="bi bi-check-circle me-1"></i>ประเมินครบแล้ว'; }

    } else {
        if(btnSave) { btnSave.disabled = false; btnSave.innerHTML = 'บันทึกผลการประเมิน'; }

        pendingDrivers.forEach(function(drv, index) {
            var nickname = drv.nickname && drv.nickname !== "-" ? `(${drv.nickname})` : '';

            html += `
            <div class="eval-driver-card p-3 p-md-4 mb-3" data-position="${drv.position}">
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 border-bottom border-success border-opacity-25 pb-3">
                    <div class="mb-2 mb-md-0">
                        <div class="fw-bold text-light" style="font-size: 1.1rem;">${index+1}. ${drv.name} <span class="text-warning">${nickname}</span></div>
                        <div class="text-secondary small mt-1"><i class="bi bi-briefcase me-1"></i>${drv.position || '-'}</div>
                    </div>
                    <div class="form-check form-switch mb-0 bg-dark px-3 py-2 rounded border border-secondary border-opacity-50">
                        <input class="form-check-input border-secondary shadow-none eval-na-check ms-0 mt-1" type="checkbox" id="u_na_${drv.id}" onchange="window.u_toggleEvalNA(this, '${drv.id}')" style="cursor: pointer;">
                        <label class="form-check-label text-secondary small ms-2 cursor-pointer pt-1" for="u_na_${drv.id}">ไม่ได้ประสานงาน</label>
                    </div>
                </div>
                
                <div class="eval-score-section mb-4 mt-2">
                    <div class="d-flex justify-content-between align-items-end mb-3">
                        <label class="small text-muted fw-bold mb-0"><i class="bi bi-arrows-collapse me-1"></i> เลื่อนสไลเดอร์เพื่อให้คะแนน (0-10)</label>
                        <span class="badge bg-secondary text-light fs-6 eval-score-display px-3 py-2 shadow-sm rounded-pill" id="score_val_${drv.id}">แตะเลื่อนให้คะแนน</span>
                    </div>
                    <input type="range" class="eval-range eval-score-input w-100" min="0" max="10" step="1" value="0" 
                        data-id="${drv.id}" data-name="${drv.name}" data-touched="false" 
                        oninput="
                            this.setAttribute('data-touched', 'true');
                            this.classList.add('touched');
                            var disp = document.getElementById('score_val_${drv.id}');
                            disp.innerText = this.value + ' คะแนน';
                            disp.className = 'badge bg-success text-white fs-6 eval-score-display px-4 py-2 shadow-lg rounded-pill';
                        ">
                    <div class="d-flex justify-content-between text-muted small mt-1 px-1" style="font-size: 0.7rem;">
                        <span>0 (ปรับปรุง)</span>
                        <span>10 (ดีเยี่ยม)</span>
                    </div>
                </div>

                <div class="eval-comment-container border-top border-secondary border-opacity-25 pt-3">
                    <input type="text" class="form-control bg-black text-light border-secondary eval-comment-input shadow-none py-2" placeholder="เพิ่มคอมเมนต์เสนอแนะ (ไม่บังคับ)...">
                </div>
            </div>`;
        });
    }
    
    var listEl = document.getElementById('u_evalDriverList');
    if(listEl) {
        listEl.innerHTML = html;
        window.u_filterEvalDrivers(); 
    }
};

window.u_filterEvalDrivers = function() {
    var posFilterEl = document.getElementById('u_evalPositionFilter');
    var posFilter = posFilterEl ? posFilterEl.value : 'all';
    var rows = document.querySelectorAll('.eval-driver-card');
    
    rows.forEach(row => {
        var rowPos = row.getAttribute('data-position') || '';
        if (posFilter === 'all' || rowPos.includes(posFilter)) {
            row.style.display = 'block';
        } else {
            row.style.display = 'none';
        }
    });
};

window.u_setAllVisibleToNA = function() {
    var rows = document.querySelectorAll('.eval-driver-card');
    var count = 0;
    rows.forEach(function(row) {
        if (row.style.display !== 'none') {
            var naCheck = row.querySelector('.eval-na-check');
            var scoreInput = row.querySelector('.eval-score-input');
            if (naCheck && scoreInput && !naCheck.disabled && !naCheck.checked && scoreInput.getAttribute('data-touched') !== 'true') {
                naCheck.checked = true;
                window.u_toggleEvalNA(naCheck, scoreInput.getAttribute('data-id'));
                count++;
            }
        }
    });
    if(count > 0) {
        Swal.fire({
            toast: true, position: 'top', icon: 'success', 
            title: 'ตั้งค่า "ไม่ได้ประสานงาน" ' + count + ' รายการ', 
            showConfirmButton: false, timer: 1500, background: '#1e1e1e', color: '#fff'
        });
    } else {
        Swal.fire({
            toast: true, position: 'top', icon: 'info', 
            title: 'ไม่มีรายการที่สามารถตั้งค่าได้', 
            showConfirmButton: false, timer: 1500, background: '#1e1e1e', color: '#fff'
        });
    }
};

window.u_toggleEvalNA = function(cb, id) {
    var row = cb.closest('.eval-driver-card');
    if(!row) return;
    var input = row.querySelector('.eval-score-input');
    var display = row.querySelector('#score_val_' + id);
    var comment = row.querySelector('.eval-comment-input');
    
    if(cb.checked) {
        row.style.opacity = '0.5'; 
        if(input) { input.disabled = true; }
        if(display) { 
            display.innerText = 'ไม่ได้ประสานงาน'; 
            display.className = 'badge bg-secondary text-light fs-6 eval-score-display px-3 py-2 shadow-sm rounded-pill';
        }
        if(comment) { comment.disabled = true; comment.value = ''; }
    } else {
        row.style.opacity = '1';
        if(input) { input.disabled = false; }
        if(display) { 
            if(input.getAttribute('data-touched') === 'true') {
                display.innerText = input.value + ' คะแนน';
                display.className = 'badge bg-success text-white fs-6 eval-score-display px-4 py-2 shadow-lg rounded-pill';
            } else {
                display.innerText = 'แตะเลื่อนให้คะแนน';
                display.className = 'badge bg-secondary text-light fs-6 eval-score-display px-3 py-2 shadow-sm rounded-pill';
            }
        }
        if(comment) { comment.disabled = false; }
    }
};

window.u_saveEvaluations = function() {
    var monthEl = document.getElementById('u_evalMonth');
    var monthYear = monthEl ? monthEl.value : '';
    if(!monthYear) {
        Swal.fire({icon:'warning', title:'แจ้งเตือน', text:'กรุณาเลือกประจำเดือน'});
        return;
    }

    var rows = document.querySelectorAll('.eval-driver-card');
    var evals = [];
    var untouchedCount = 0;

    rows.forEach(function(row) {
        var scoreInput = row.querySelector('.eval-score-input');
        if(!scoreInput) return;

        var id = scoreInput.getAttribute('data-id');
        var name = scoreInput.getAttribute('data-name');
        var naCheck = row.querySelector('.eval-na-check');
        var commentInput = row.querySelector('.eval-comment-input');
        var comment = commentInput ? commentInput.value.trim() : '';
        
        if (naCheck && naCheck.checked) {
            evals.push({ driverId: id, driverName: name, score: '-', status: 'ไม่ได้ประสานงาน', comment: comment });
        } else {
            if (scoreInput.getAttribute('data-touched') === 'true') {
                var score = parseInt(scoreInput.value);
                evals.push({ driverId: id, driverName: name, score: score, status: 'ประเมินแล้ว', comment: comment });
            } else {
                untouchedCount++;
            }
        }
    });

    if (untouchedCount > 0) {
        Swal.fire({icon:'warning', title:'ประเมินยังไม่ครบ', text:'กรุณาเลื่อนสไลเดอร์ให้คะแนน หรือติ๊กเลือก "ไม่ได้ประสานงาน" ให้ครบทุกคนที่แสดงอยู่บนหน้าจอครับ'});
        return;
    }

    if (evals.length === 0) {
        Swal.fire({icon:'warning', title:'แจ้งเตือน', text:'ไม่มีข้อมูลใหม่ให้บันทึก'});
        return;
    }

    Swal.fire({title: 'กำลังบันทึกข้อมูล...', allowOutsideClick:false, didOpen:()=>Swal.showLoading()});
    
    window.callAPI({
        action: 'submitEvaluations',
        payload: {
            monthYear: monthYear,
            evaluatorId: window.currentUserData.id,
            evaluatorName: window.currentUserData.name,
            evaluatorPos: window.currentUserData.position,
            evaluations: evals
        }
    }).then(function(res) {
        if(res.success) {
            Swal.fire('สำเร็จ', 'ส่งผลประเมินเรียบร้อยแล้ว', 'success');
            window.u_checkCurrentMonthEvalStatus(); 
            
            window.callAPI({
                action: 'getUserEvaluations',
                empId: window.currentUserData.id
            }).then(function(evalData) {
                window.globalUserEvals = evalData || [];
                var evCountEl = document.getElementById('u_evalCountBadge');
                if(evCountEl) evCountEl.innerText = window.globalUserEvals.length;
                window.u_renderEvalsList();
            });
        } else {
            Swal.fire('ผิดพลาด', res.message, 'error');
        }
    });
};

window.u_renderEvalsList = function() {
    var list = window.globalUserEvals || [];
    var tab = document.getElementById('u_userEvalListTab');
    if (!list || list.length === 0) {
        if(tab) tab.innerHTML = '<div class="text-center text-muted py-5 small"><i class="bi bi-star fs-1 d-block mb-3 text-success opacity-50"></i>ยังไม่มีประวัติการถูกประเมิน</div>';
        return;
    }

    var grouped = {};
    list.forEach(function(e) {
        if (!grouped[e.monthYear]) grouped[e.monthYear] = { items: [], totalScore: 0, validCount: 0 };
        grouped[e.monthYear].items.push(e);
        if (e.status !== 'ไม่ได้ประสานงาน' && !isNaN(parseFloat(e.score))) {
            grouped[e.monthYear].totalScore += parseFloat(e.score);
            grouped[e.monthYear].validCount++;
        }
    });

    var sortedMonths = Object.keys(grouped).sort().reverse();
    var html = '<div class="accordion accordion-flush rounded-3 overflow-hidden border border-secondary border-opacity-25" id="evalAccordion">';
    
    sortedMonths.forEach(function(month, index) {
        var group = grouped[month];
        var avg = group.validCount > 0 ? (group.totalScore / group.validCount).toFixed(2) : "-";
        var avgHtml = group.validCount > 0 ? `<span class="badge bg-success ms-2 fs-6 shadow-sm">${avg} / 10</span>` : `<span class="badge bg-secondary ms-2 shadow-sm">ไม่มีคะแนน</span>`;
        var isExpanded = index === 0 ? 'show' : '';
        var isCollapsedBtn = index === 0 ? '' : 'collapsed';

        var itemsHtml = '';
        group.items.forEach(function(e, i) {
            var isNA = (e.status === 'ไม่ได้ประสานงาน');
            var scoreHtml = isNA 
                ? '<span class="badge bg-dark border border-secondary text-secondary fw-normal px-2 py-1">ไม่ได้ประสานงาน</span>'
                : `<span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 fs-6 px-3 py-1 shadow-sm">${e.score} / 10</span>`;
            var commentHtml = e.comment ? `<div class="mt-2 text-light small fst-italic py-2 px-3 rounded" style="background: rgba(0,0,0,0.3); border-left: 2px solid #ffc107;"><i class="bi bi-chat-quote text-warning me-2"></i>${e.comment}</div>` : '';
            var textClass = isNA ? 'text-secondary opacity-50' : 'text-success';
            var iconClass = isNA ? 'bi-person-dash' : 'bi-person-check-fill';
            
            itemsHtml += `
            <div class="p-3 mb-2 rounded" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="fw-bold ${textClass} small"><i class="bi ${iconClass} me-2"></i>ผู้ประเมินคนที่ ${i+1}</div>
                    <div>${scoreHtml}</div>
                </div>
                ${commentHtml}
            </div>`;
        });

        html += `
        <div class="accordion-item bg-transparent border-bottom border-secondary border-opacity-25">
            <h2 class="accordion-header" id="heading${index}">
                <button class="accordion-button ${isCollapsedBtn} shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                    <div class="d-flex justify-content-between align-items-center w-100 pe-3">
                        <span class="fw-bold text-warning"><i class="bi bi-calendar-event me-2"></i>ประจำเดือน: ${month}</span>
                        <div><span class="small text-muted d-none d-md-inline">เฉลี่ยรวม:</span> ${avgHtml}</div>
                    </div>
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse ${isExpanded}" data-bs-parent="#evalAccordion">
                <div class="accordion-body p-3" style="background: rgba(0,0,0,0.3);">
                    ${itemsHtml}
                </div>
            </div>
        </div>`;
    });
    html += '</div>';
    if(tab) tab.innerHTML = html;
};

window.u_renderUserProfile = function(d) {
    if (!d) return;
    var finalLeaveUrl = "#"; 
    try { 
        var token = btoa(unescape(encodeURIComponent(d.id + "|" + new Date().getTime()))); 
        finalLeaveUrl = "https://script.google.com/macros/s/AKfycby32LX4-2iN0zPA9EmhSneiX1Pz66uCMlBnqE2jiWtnVD8L9BG6zcLUyJ4Rh15WilT0uQ/exec?sso_user=" + encodeURIComponent(d.id) + "&sso_token=" + token; 
    } catch (e) {}
    
    var photoUrl = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; 
    if (d.docs && d.docs.PHOTO && d.docs.PHOTO.url && d.docs.PHOTO.url.indexOf('drive.google.com') !== -1) { 
        var m = d.docs.PHOTO.url.match(/[-\w]{25,}/); 
        if (m) photoUrl = "https://drive.google.com/thumbnail?id=" + m[0] + "&sz=w300-h300"; 
    }
    
    var nicknameText = d.nickname ? '(' + d.nickname + ')' : ''; 
    var phoneText = d.phone || '-'; 
    var ssoText = (d.ssoHosp && d.ssoHosp !== '-') ? d.ssoHosp : (d.ssoType || 'ไม่มีข้อมูล');
    var ageText = window.u_calcAge(d.birthDate);
    
    var html = `
    <div class="driver-card text-center overflow-hidden mb-4">
        <div class="driver-card-header position-relative">
            <div class="mt-4 mb-3 position-relative d-inline-block">
                <img src="${photoUrl}" class="rounded-circle object-fit-cover shadow-lg" style="width: 130px; height: 130px; border: 4px solid var(--logistic-primary); background: #222;">
            </div>
            <h4 class="fw-bold mb-1 text-white">${d.name}</h4>
            <div class="text-warning small fw-bold mb-2">${nicknameText}</div>
            <span class="badge bg-dark border border-secondary text-light fw-normal px-3 py-2 rounded-pill mt-1">
                <i class="bi bi-briefcase text-warning me-1"></i> ${d.position || '-'}
            </span>
        </div>
        
        <div class="p-3 text-start bg-black bg-opacity-25">
            <div class="info-box d-flex justify-content-between align-items-center">
                <span class="small text-muted"><i class="bi bi-person-vcard me-2"></i>รหัสพนักงาน</span>
                <span class="text-white font-monospace fw-bold fs-6">${d.id}</span>
            </div>
            <div class="info-box d-flex justify-content-between align-items-center">
                <span class="small text-muted"><i class="bi bi-calendar-heart me-2"></i>อายุ</span>
                <span class="text-white fw-bold fs-6">${ageText}</span>
            </div>
            <div class="info-box d-flex justify-content-between align-items-center">
                <span class="small text-muted"><i class="bi bi-telephone me-2"></i>เบอร์โทรศัพท์</span>
                <span class="text-white fw-bold fs-6">${phoneText}</span>
            </div>
            <div class="info-box d-flex justify-content-between align-items-center">
                <span class="small text-muted"><i class="bi bi-hospital me-2"></i>ประกันสังคม</span>
                <span class="text-info fw-bold text-truncate text-end" style="max-width: 140px;" title="${ssoText}">${ssoText}</span>
            </div>
            
            <div class="info-box d-flex justify-content-between align-items-center">
                <span class="small text-muted"><i class="bi bi-calendar-check me-2"></i>อายุงาน</span>
                <div class="text-end">
                    <div class="text-warning fw-bold" style="font-size: 0.9rem;">${window.u_calcTenure(d.startDate)}</div>
                    <div class="text-muted" style="font-size: 0.7rem;">(เริ่ม ${window.u_formatDate(d.startDate)})</div>
                </div>
            </div>
            
            <button class="btn btn-outline-warning w-100 rounded-pill mb-4 mt-3 fw-bold shadow-sm" onclick="window.u_openEditModal('${d.id}')">
                <i class="bi bi-pencil-square me-2"></i>อัปเดตข้อมูลส่วนตัว
            </button>

            <h6 class="text-warning small fw-bold mb-3 px-2 border-bottom border-secondary border-opacity-50 pb-2"><i class="bi bi-lightning-charge me-1"></i> เมนูด่วน (Quick Actions)</h6>
            <div class="row g-2">
                <div class="col-6">
                    <a href="${finalLeaveUrl}" target="_blank" class="btn quick-action-btn w-100 py-2 d-flex flex-column align-items-center gap-1 text-decoration-none shadow-sm">
                        <i class="bi bi-calendar2-week fs-5 text-white"></i><span class="small fw-bold" style="font-size: 0.8rem;">ลางาน</span>
                    </a>
                </div>
                <div class="col-6">
                    <button onclick="window.u_openAccidentModal()" class="btn quick-action-btn w-100 py-2 d-flex flex-column align-items-center gap-1 shadow-sm">
                        <i class="bi bi-cone-striped fs-5 text-danger"></i><span class="small fw-bold" style="font-size: 0.8rem;">อุบัติเหตุ</span>
                    </button>
                </div>
                <div class="col-6">
                    <button onclick="window.u_openRepairModal()" class="btn quick-action-btn w-100 py-2 d-flex flex-column align-items-center gap-1 shadow-sm">
                        <i class="bi bi-wrench-adjustable fs-5 text-primary"></i><span class="small fw-bold" style="font-size: 0.8rem;">แจ้งซ่อม</span>
                    </button>
                </div>
                <div class="col-6">
                    <button onclick="window.u_openYardModal()" class="btn quick-action-btn w-100 py-2 d-flex flex-column align-items-center gap-1 shadow-sm">
                        <i class="bi bi-geo-alt fs-5 text-info"></i><span class="small fw-bold" style="font-size: 0.8rem;">ลานตู้</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    var uProfileCard = document.getElementById('userProfileCard');
    if(uProfileCard) uProfileCard.innerHTML = html;
};

window.u_renderPayslipsList = function() {
    var list = window.globalUserPayslips || [];
    var html = '';
    if (list.length > 0) {
        list.forEach(function(p) {
            var formattedDate = window.u_formatDate(p.payDate);
            html += `
            <div class="history-item d-flex flex-wrap justify-content-between align-items-center border-start border-4 border-warning">
                <div>
                    <div class="text-warning fw-bold mb-1"><i class="bi bi-calendar-check me-2"></i>งวดวันที่: ${formattedDate}</div>
                    <div class="text-light small"><i class="bi bi-cash me-2"></i>รับสุทธิ: <b class="fs-6 ms-1 text-white">${window.u_numberWithCommas(p.netSalary)}</b> บาท</div>
                </div>
                <a href="${p.pdfUrl}" target="_blank" class="btn btn-sm btn-warning rounded-pill px-4 mt-2 mt-md-0 fw-bold text-dark d-flex justify-content-center align-items-center">
                    <i class="bi bi-file-pdf me-1"></i> เปิดสลิป
                </a>
            </div>`;
        });
    } else {
        html = '<div class="text-center text-muted py-5 small"><i class="bi bi-cash-stack fs-1 d-block mb-3 text-warning opacity-50"></i>ยังไม่มีประวัติสลิปเงินเดือน</div>';
    }
    var tab = document.getElementById('u_userPayslipListTab');
    if(tab) tab.innerHTML = html;
};

window.u_renderAccidentsList = function() { 
    var limitEl = document.getElementById('u_accLimit');
    var limit = limitEl ? limitEl.value : '10'; 
    var list = limit === 'all' ? (window.globalUserAccidents || []) : (window.globalUserAccidents || []).slice(0, parseInt(limit)); 
    var html = ''; 
    if (list.length > 0) { 
        list.forEach(function(a) { 
            var safePdfUrl = a.pdfUrl !== '-' ? a.pdfUrl : '#'; 
            var statusColor = (a.status === 'Pending' || a.status === 'รอดำเนินการ') ? 'text-warning' : 'text-success'; 
            var statusText = a.status === 'Pending' ? 'รอดำเนินการ' : a.status; 
            html += `
            <div class="history-item border-start border-4 border-info">
                <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary border-opacity-25 w-100">
                    <span class="font-monospace text-info fw-bold"><i class="bi bi-hash"></i>${a.docNo}</span>
                    <span class="badge bg-dark border border-secondary ${statusColor} px-3 py-1 rounded-pill">${statusText}</span>
                </div>
                <div class="row g-2 small text-light mb-3 w-100">
                    <div class="col-md-6"><i class="bi bi-calendar-event me-2 text-muted"></i>${a.accDate} เวลา ${a.accTime}</div>
                    <div class="col-md-6 text-truncate" title="${a.location}"><i class="bi bi-geo-alt me-2 text-muted"></i>${a.location}</div>
                    <div class="col-md-6"><i class="bi bi-truck me-2 text-muted"></i>${a.vehType} (${a.truckPlate})</div>
                    <div class="col-md-6"><i class="bi bi-exclamation-triangle me-2 text-danger"></i>${a.cause}</div>
                </div>
                <div class="text-md-end text-center w-100">
                    <a href="${safePdfUrl}" target="_blank" class="btn btn-sm btn-outline-info rounded-pill px-4"><i class="bi bi-file-pdf me-1"></i>เอกสารแจ้งเหตุ</a>
                </div>
            </div>`; 
        }); 
    } else { 
        html = '<div class="text-center text-muted py-5 small"><i class="bi bi-shield-check fs-1 d-block mb-3 text-info opacity-50"></i>ไม่มีประวัติอุบัติเหตุ</div>'; 
    } 
    var tab = document.getElementById('u_userAccidentListTab');
    if(tab) tab.innerHTML = html; 
};

window.u_renderWarningsList = function() { 
    var limitEl = document.getElementById('u_warnLimit');
    var limit = limitEl ? limitEl.value : '10'; 
    var list = limit === 'all' ? (window.globalUserWarnings || []) : (window.globalUserWarnings || []).slice(0, parseInt(limit)); 
    var html = ''; 
    if (list.length > 0) { 
        list.forEach(function(w) { 
            html += `
            <div class="history-item border-start border-4 border-danger d-flex flex-wrap justify-content-between align-items-center">
                <div class="text-danger fw-bold mb-2 mb-md-0 w-100">
                    <i class="bi bi-exclamation-circle-fill me-2"></i>วันที่ออกใบเตือน: <span class="text-light fw-normal ms-1">${window.u_formatDate(w.date)}</span>
                </div>
                <button onclick="window.u_openPreview('${w.url}')" class="btn btn-sm btn-outline-danger px-4 rounded-pill">
                    <i class="bi bi-eye me-1"></i>ดูเอกสาร
                </button>
            </div>`; 
        }); 
    } else { 
        html = '<div class="text-center text-muted py-5 small"><i class="bi bi-emoji-smile fs-1 d-block mb-3 text-success opacity-50"></i>ประวัติขาวสะอาด ไม่มีใบเตือน</div>'; 
    } 
    var tab = document.getElementById('u_userWarningListTab');
    if(tab) tab.innerHTML = html; 
};

window.u_renderDocs = function(d) {
    if(!d || !d.docs) return;
    var docTypes = [ 
        {key:'PHOTO', name:'รูปถ่ายหน้าตรง', icon:'bi-person-bounding-box'}, 
        {key:'ID_CARD', name:'สำเนาบัตรประชาชน', icon:'bi-person-vcard'}, 
        {key:'PASSPORT', name:'หนังสือเดินทาง', icon:'bi-passport'}, 
        {key:'HOUSE_REG', name:'สำเนาทะเบียนบ้าน', icon:'bi-house-door'}, 
        {key:'LICENSE', name:'ใบอนุญาตขับขี่', icon:'bi-car-front'}, 
        {key:'CRIMINAL_RECORD', name:'ประวัติอาชญากรรม', icon:'bi-shield-check'}, 
        {key:'HEALTH_CHECK', name:'ใบตรวจสุขภาพ', icon:'bi-heart-pulse'}, 
        {key:'EDU_CERT', name:'วุฒิการศึกษา', icon:'bi-mortarboard'}, 
        {key:'OTHER_1', name:'เอกสารอื่นๆ 1', icon:'bi-file-earmark-text'}, 
        {key:'OTHER_2', name:'เอกสารอื่นๆ 2', icon:'bi-file-earmark-text'} 
    ];
    
    var html = ''; 
    var uploadedCount = 0;
    
    docTypes.forEach(function(t, index) {
        var hasFile = (d.docs[t.key] && d.docs[t.key].url); 
        if(hasFile) uploadedCount++;
        
        var statusBadge = hasFile ? '<span class="text-success small fw-bold"><i class="bi bi-check-circle me-1"></i>อัปโหลดแล้ว</span>' : '<span class="text-secondary small opacity-50">ยังไม่มีไฟล์</span>';
        var viewBtn = hasFile ? `<button type="button" onclick="window.u_openPreview('${d.docs[t.key].url}')" class="btn btn-sm btn-dark border-secondary text-light ms-1 rounded-circle hover-scale" title="ดูไฟล์"><i class="bi bi-eye"></i></button>` : '<button type="button" class="btn btn-sm btn-dark border-secondary text-muted ms-1 rounded-circle" disabled><i class="bi bi-eye-slash"></i></button>';
        
        var inputId = 'u_fileInput_' + index; 
        var spinnerId = 'u_spinner_' + index;
        var iconClass = t.icon.includes('text-') ? t.icon : t.icon + ' text-warning';

        html += `
        <div class="col-md-6">
            <div class="upload-zone position-relative">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center"><i class="bi ${iconClass} fs-5 me-2"></i><span class="text-light fw-bold small">${t.name}</span></div>
                    ${viewBtn}
                </div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    ${statusBadge}
                    <div id="${spinnerId}" class="spinner-border spinner-border-sm text-warning" role="status" style="display:none;"></div>
                </div>
                <div class="input-group input-group-sm mt-2">
                    <input type="file" class="form-control bg-dark border-secondary text-secondary shadow-none" id="${inputId}" onchange="window.u_handleSingleUpload('${t.key}', '${inputId}', '${spinnerId}')">
                </div>
            </div>
        </div>`;
    });
    var listTab = document.getElementById('u_userDocList');
    if(listTab) listTab.innerHTML = html; 
    
    var badge = document.getElementById('u_docCountBadge');
    if(badge) badge.innerText = uploadedCount + '/' + docTypes.length;
};

window.u_handleSingleUpload = async function(docKey, inputId, spinnerId) {
    var fileInput = document.getElementById(inputId); 
    var spinner = document.getElementById(spinnerId); 
    if (!fileInput || fileInput.files.length === 0) return;
    
    fileInput.disabled = true; 
    if(spinner) spinner.style.display = 'block';
    
    var fileData = await window.u_getBase64User(fileInput.files[0]);
    var payload = { 
        empId: window.currentUserData.id, 
        currentUserRole: 'User', 
        username: window.currentUserData.username, 
        password: window.currentUserData.password, 
        fullname: window.currentUserData.name, 
        position: window.currentUserData.position, 
        startDate: window.currentUserData.startDate, 
        phone: window.currentUserData.phone 
    };
    
    var map = { 'PHOTO': 'filePhoto', 'ID_CARD': 'fileIdCard', 'PASSPORT': 'filePassport', 'HOUSE_REG': 'fileHouse', 'LICENSE': 'fileDrive', 'CRIMINAL_RECORD': 'fileCriminal', 'HEALTH_CHECK': 'fileHealth', 'EDU_CERT': 'fileEdu', 'OTHER_1': 'fileOther1', 'OTHER_2': 'fileOther2' };
    payload[map[docKey]] = fileData;
    
    window.callAPI({ 
        action: 'handleEmployeeSave', 
        form: payload, 
        mode: 'edit' 
    }).then(function(res) { 
        if(spinner) spinner.style.display = 'none'; 
        fileInput.disabled = false; 
        fileInput.value = ''; 
        if(res.success) { 
            Swal.fire({
                toast: true, position: 'top-end', icon: 'success', 
                title: 'อัปโหลดสำเร็จ', showConfirmButton: false, timer: 1500, background: '#1e1e1e', color: '#fff'
            }); 
            window.loadUserData(); 
        } else { 
            Swal.fire({title:'ผิดพลาด', text:res.message, icon:'error', background: '#1e1e1e', color: '#fff'}); 
        } 
    });
};

window.u_openEditModal = function(id) { 
    var form = document.getElementById('u_empForm');
    if(form) form.reset();
    
    var d = window.currentUserData;
    if(d) {
        document.getElementById('u_empId').value = d.id;
        document.getElementById('u_role').value = d.role;
        document.getElementById('u_empStatus').value = d.status || 'Active';
        document.getElementById('u_resignDate').value = window.u_safeDate(d.resignDate);
        document.getElementById('u_username').value = d.username;
        document.getElementById('u_startDate').value = window.u_safeDate(d.startDate);
        
        document.getElementById('u_fullname').value = d.name;
        document.getElementById('u_gender').value = d.gender || '-';
        document.getElementById('u_ssoType').value = d.ssoType || '-';
        
        document.getElementById('u_nickname').value = d.nickname || '';
        document.getElementById('u_phone').value = d.phone || '';
        document.getElementById('u_password').value = d.password;
        document.getElementById('u_birthDate').value = window.u_safeDate(d.birthDate);
        document.getElementById('u_address').value = d.address || '';
        
        document.getElementById('u_idCardNum').value = d.idCardNum || '';
        document.getElementById('u_idExp').value = window.u_safeDate(d.idExp);
        document.getElementById('u_licNum').value = d.licNum || '';
        document.getElementById('u_licExp').value = window.u_safeDate(d.licExp);
        
        var lSelect = document.getElementById('u_licType');
        if(lSelect) {
            for(var i=0; i<lSelect.options.length; i++){
                if(lSelect.options[i].value === d.licType){
                    lSelect.selectedIndex = i; break;
                }
            }
        }
        var hSelect = document.getElementById('u_ssoHosp');
        if(hSelect) {
            for(var i=0; i<hSelect.options.length; i++){
                if(hSelect.options[i].value === d.ssoHosp){
                    hSelect.selectedIndex = i; break;
                }
            }
        }
    }
    
    var modalEl = document.getElementById('u_empModal');
    if(modalEl) new bootstrap.Modal(modalEl).show();
    
    setTimeout(function() { 
        var tabInfoBtn = document.querySelector('button[data-bs-target="#u_tabInfo"]');
        if(tabInfoBtn) {
            var tab1 = new bootstrap.Tab(tabInfoBtn); 
            tab1.show(); 
        }
    }, 200); 
};

window.u_submitEmpForm = async function(e) {
    e.preventDefault();
    Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    var getVal = (id) => { var el = document.getElementById(id); return el ? el.value : ''; };
    
    var form = {
        empId: getVal('u_empId'),
        role: getVal('u_role'),
        status: getVal('u_empStatus'),
        resignDate: getVal('u_resignDate'),
        birthDate: getVal('u_birthDate'),
        gender: getVal('u_gender'), 
        username: getVal('u_username'),
        password: getVal('u_password'),
        prefix: '',
        fullname: getVal('u_fullname'), 
        nickname: getVal('u_nickname'),
        ssoType: getVal('u_ssoType'), 
        ssoHosp: getVal('u_ssoHosp'), 
        address: getVal('u_address'), 
        idExp: getVal('u_idExp'),
        licExp: getVal('u_licExp'),
        idCardNum: getVal('u_idCardNum'),
        licNum: getVal('u_licNum'),
        licType: getVal('u_licType'),
        resignReason: '',
        position: window.currentUserData ? window.currentUserData.position : '',
        startDate: getVal('u_startDate'),
        phone: getVal('u_phone'),
        currentUserRole: 'User',
        filePhoto: await window.u_getBase64User(document.getElementById('u_filePhoto') ? document.getElementById('u_filePhoto').files[0] : null),
        fileIdCard: await window.u_getBase64User(document.getElementById('u_fileIdCard') ? document.getElementById('u_fileIdCard').files[0] : null),
        filePassport: await window.u_getBase64User(document.getElementById('u_filePassport') ? document.getElementById('u_filePassport').files[0] : null),
        fileHouse: await window.u_getBase64User(document.getElementById('u_fileHouse') ? document.getElementById('u_fileHouse').files[0] : null),
        fileDrive: await window.u_getBase64User(document.getElementById('u_fileDrive') ? document.getElementById('u_fileDrive').files[0] : null),
        fileEdu: await window.u_getBase64User(document.getElementById('u_fileEdu') ? document.getElementById('u_fileEdu').files[0] : null),
        fileCriminal: await window.u_getBase64User(document.getElementById('u_fileCriminal') ? document.getElementById('u_fileCriminal').files[0] : null),
        fileHealth: await window.u_getBase64User(document.getElementById('u_fileHealth') ? document.getElementById('u_fileHealth').files[0] : null),
        fileWarn: null,
        fileOther1: null,
        fileOther2: null
    };
    
    try {
        const res = await window.callAPI({
            action: 'handleEmployeeSave',
            form: form,
            mode: 'edit'
        });
        
        if(res.success) {
            Swal.fire('สำเร็จ', res.message, 'success');
            var m = bootstrap.Modal.getInstance(document.getElementById('u_empModal'));
            if(m) m.hide();
            window.loadUserData();
        } else {
            Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
        }
    } catch(err) {
        console.error(err);
    }
};

window.u_openYardModal = function() { 
    var sInput = document.getElementById('u_yardSearchInput');
    if(sInput) sInput.value = ''; 
    var modalEl = document.getElementById('u_yardModal');
    if(modalEl) new bootstrap.Modal(modalEl).show(); 
    
    var yList = document.getElementById("u_yardList");
    if(yList) yList.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-info"></div><p class="mt-2 text-muted">กำลังโหลดข้อมูล...</p></div>'; 
    
    window.callAPI({ action: 'getYardData' }).then(function(list) { 
        window.globalYardData = list || []; 
        var zones = []; 
        window.globalYardData.forEach(function(y) { 
            if(y.zone && y.zone !== "ไม่ระบุโซน" && y.zone !== "") { 
                if(zones.indexOf(y.zone) === -1) zones.push(y.zone); 
            } 
        }); 
        var select = document.getElementById("u_yardZoneSelect"); 
        if(select) {
            select.innerHTML = '<option value="all" class="text-dark">🌐 แสดงทุกโซน</option>'; 
            zones.sort().forEach(function(z) { 
                select.innerHTML += '<option value="' + z + '" class="text-dark">' + z + '</option>'; 
            }); 
        }
        window.u_renderYards(window.globalYardData); 
    }); 
};

window.u_filterYards = function() { 
    var sInput = document.getElementById("u_yardSearchInput");
    var searchTxt = sInput ? sInput.value.toLowerCase() : ''; 
    var zSelect = document.getElementById("u_yardZoneSelect");
    var selectedZone = zSelect ? zSelect.value : 'all'; 
    
    var filteredList = (window.globalYardData || []).filter(function(y) { 
        var matchSearch = y.name.toLowerCase().includes(searchTxt) || y.location.toLowerCase().includes(searchTxt); 
        var matchZone = (selectedZone === "all") || (y.zone === selectedZone); 
        return matchSearch && matchZone; 
    }); 
    window.u_renderYards(filteredList); 
};

window.u_renderYards = function(list) { 
    var html = ""; 
    if(!list || list.length === 0){ 
        html = "<div class='col-12 text-center p-5 text-muted'>ไม่พบข้อมูลลานตู้คอนเทนเนอร์ที่ค้นหา</div>"; 
    } else { 
        list.forEach(function(y) { 
            var zoneBadge = (y.zone && y.zone !== "ไม่ระบุโซน" && y.zone !== "") ? '<span class="badge bg-secondary bg-opacity-50 border border-secondary text-light mb-2">' + y.zone + '</span>' : ''; 
            html += `
            <div class="col-md-6">
                <div class="card bg-black border-secondary h-100 hover-scale position-relative">
                    <div class="card-body">
                        ${zoneBadge}
                        <h5 class="text-info fw-bold mb-2">${y.name}</h5>
                        <p class="small text-secondary mb-1"><i class="bi bi-geo-alt text-danger me-1"></i> ${y.location}</p>
                        <p class="small text-secondary mb-3"><i class="bi bi-telephone text-success me-1"></i> ${y.contact || '-'}</p>
                        <table class="table table-dark table-sm border-secondary text-center align-middle mb-3" style="background: rgba(255,255,255,0.02);">
                            <thead class="text-muted" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <tr><th></th><th>ตู้สั้น (20')</th><th>ตู้ยาว (40')</th></tr>
                            </thead>
                            <tbody>
                                <tr><td class="text-start text-warning">ตู้เปล่า</td><td>${y.emptyShort || '-'}</td><td>${y.emptyLong || '-'}</td></tr>
                                <tr><td class="text-start text-danger">ตู้หนัก</td><td>${y.fullShort || '-'}</td><td>${y.fullLong || '-'}</td></tr>
                            </tbody>
                        </table>
                        <a href="${y.map}" target="_blank" class="btn btn-outline-info btn-sm w-100 rounded-pill"><i class="bi bi-map me-1"></i> เปิดแผนที่ (Google Map)</a>
                    </div>
                </div>
            </div>`; 
        }); 
    } 
    var yList = document.getElementById("u_yardList");
    if(yList) yList.innerHTML = html; 
};

window.u_openRepairModal = function() { 
    var form = document.getElementById('u_userRepairForm');
    if(form) form.reset(); 
    
    var dEl = document.getElementById('u_repDate');
    if(dEl) dEl.valueAsDate = new Date(); 
    
    const container = document.getElementById('u_userRepairItemsContainer'); 
    if(container) {
        const rows = container.querySelectorAll('.u-repair-row'); 
        rows.forEach((row, index) => { if(index > 0) row.remove(); }); 
        if(rows.length > 0) {
            let firstRow = rows[0]; 
            var rs = firstRow.querySelector('.rep-select'); if(rs) rs.value = ""; 
            var rc = firstRow.querySelector('.rep-custom'); 
            if(rc) { rc.value = ""; rc.classList.add('d-none'); rc.required = false; }
        }
    }
    
    var pSelect = document.getElementById('u_repPlate');
    if (pSelect && pSelect.options.length <= 1) { 
        window.u_loadFleetVehicles(); 
    } 
    
    var modalEl = document.getElementById('u_userRepairModal');
    if(modalEl) new bootstrap.Modal(modalEl).show(); 
};

// 🟢 เพิ่มฟังก์ชัน u_openAccidentModal ที่ตกหล่นไป
window.u_openAccidentModal = function() {
    var modalEl = document.getElementById('accidentModal');
    if (modalEl) {
        new bootstrap.Modal(modalEl).show();
    } else if (typeof window.openAccidentModal === 'function') {
        window.openAccidentModal();
    } else {
        Swal.fire({
            icon: 'info',
            title: 'แจ้งเตือน',
            text: 'ระบบรายงานอุบัติเหตุกำลังอยู่ระหว่างปรับปรุง หรือหน้าต่างข้อมูลโหลดไม่สมบูรณ์',
            background: '#1e1e1e',
            color: '#fff'
        });
    }
};

window.u_loadFleetVehicles = async function() { 
    var pSelect = document.getElementById('u_repPlate');
    if(!pSelect) return;
    try { 
        const response = await fetch(window.FLEET_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: 'getFleetAnalytics' }) 
        }); 
        const data = await response.json(); 
        if (data.status === 'success' && data.data && data.data.summary) { 
            let options = '<option value="" disabled selected>-- เลือกทะเบียนรถ --</option>'; 
            data.data.summary.forEach(v => { 
                options += `<option value="${v.plate}">${v.plate} ${v.type ? '('+v.type+')' : ''}</option>`; 
            }); 
            pSelect.innerHTML = options; 
        } 
    } catch (e) { 
        pSelect.innerHTML = '<option value="">โหลดข้อมูลทะเบียนล้มเหลว</option>'; 
    } 
};

window.u_toggleCustomInput = function(selectElem) { 
    const customInput = selectElem.nextElementSibling; 
    if(!customInput) return;
    const needsDetails = ["other", "สลับยาง", "เปลี่ยนยาง", "อัดจารบี"].includes(selectElem.value); 
    if (needsDetails) { 
        customInput.classList.remove('d-none'); 
        customInput.required = true; 
        customInput.focus(); 
        if(selectElem.value !== "other") { 
            customInput.placeholder = "ระบุรายละเอียด (เช่น ตำแหน่งล้อ/จุดที่ทำ)"; 
        } else { 
            customInput.placeholder = "ระบุรายการ/อาการ"; 
        } 
    } else { 
        customInput.classList.add('d-none'); 
        customInput.required = false; 
    } 
};

window.u_addRepairRow = function() { 
    const container = document.getElementById('u_userRepairItemsContainer'); 
    if(!container) return;
    const firstRow = container.querySelector('.u-repair-row'); 
    if(!firstRow) return;
    const newRow = firstRow.cloneNode(true); 
    var rs = newRow.querySelector('.rep-select'); if(rs) rs.value = ""; 
    var rc = newRow.querySelector('.rep-custom'); 
    if(rc) { rc.value = ""; rc.classList.add('d-none'); rc.required = false; }
    container.appendChild(newRow); 
};

window.u_removeRepairRow = function(btn) { 
    const rows = document.querySelectorAll('.u-repair-row'); 
    if(rows.length > 1) { 
        btn.parentElement.remove(); 
    } else { 
        Swal.fire({
            toast: true, position:'top', icon:'warning', title:'ต้องมีอย่างน้อย 1 รายการ', 
            showConfirmButton: false, timer: 2000, background: '#1e1e1e', color: '#fff'
        }); 
    } 
};

window.u_submitRepair = async function(e) { 
    e.preventDefault(); 
    let itemsList = []; 
    document.querySelectorAll('.u-repair-row').forEach(row => { 
        var rs = row.querySelector('.rep-select');
        var rc = row.querySelector('.rep-custom');
        let selVal = rs ? rs.value : ''; 
        let custVal = rc ? rc.value : ''; 
        let itemName = selVal; 
        if (["other", "สลับยาง", "เปลี่ยนยาง", "อัดจารบี"].includes(selVal) && custVal.trim() !== "") { 
            itemName = (selVal === "other") ? custVal.trim() : `${selVal} - ${custVal.trim()}`; 
        } 
        if(itemName) { itemsList.push({ name: itemName, cost: 0 }); } 
    }); 
    
    if(itemsList.length === 0) { 
        Swal.fire({icon: 'warning', title: 'แจ้งเตือน', text: 'กรุณาระบุรายการซ่อมอย่างน้อย 1 รายการ', background: '#1e1e1e', color: '#fff'}); 
        return; 
    } 
    
    var repNoteEl = document.getElementById('u_repNote');
    let userNote = repNoteEl ? repNoteEl.value : ''; 
    let finalNote = userNote ? userNote + `\n(แจ้งโดย: ${window.currentUserData.name})` : `(แจ้งโดย: ${window.currentUserData.name})`; 
    
    var dateEl = document.getElementById('u_repDate');
    var plateEl = document.getElementById('u_repPlate');
    var mileEl = document.getElementById('u_repMile');
    
    let payload = { 
        action: 'manageRepair', subAction: 'add', 
        date: dateEl ? dateEl.value : '', 
        plate: plateEl ? plateEl.value : '', 
        mile: mileEl ? (mileEl.value || 0) : 0, 
        mechanic: '', note: finalNote, itemsJSON: JSON.stringify(itemsList) 
    }; 
    
    let btn = document.getElementById('btnSubmitRep'); 
    if(!btn) return;
    let originalText = btn.innerHTML; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังส่งคิวช่าง...'; 
    btn.disabled = true; 
    
    try { 
        const response = await fetch(window.FLEET_API_URL, { 
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) 
        }); 
        const data = await response.json(); 
        btn.innerHTML = originalText; btn.disabled = false; 
        if (data.status === 'success') { 
            Swal.fire({
                icon: 'success', 
                title: 'แจ้งซ่อมสำเร็จ!', 
                text: 'ข้อมูลถูกส่งเข้าคิวช่าง (สถานะ: รอซ่อม) เรียบร้อยแล้ว', 
                background: '#1e1e1e', 
                color: '#fff'
            }); 
            var mObj = bootstrap.Modal.getInstance(document.getElementById('u_userRepairModal'));
            if(mObj) mObj.hide(); 
        } else { throw new Error(data.message); } 
    } catch(err) { 
        btn.innerHTML = originalText; btn.disabled = false; 
        Swal.fire({
            icon: 'error', 
            title: 'ผิดพลาด', 
            text: 'ไม่สามารถส่งข้อมูลได้: ' + err.message, 
            background: '#1e1e1e', 
            color: '#fff'
        }); 
    } 
};

window.u_getBase64User = function(file) { 
    return new Promise(function(resolve) { 
        if (!file) { resolve(null); return; } 
        var reader = new FileReader(); 
        reader.onload = function() { 
            resolve({base64: reader.result.split(',')[1], type: file.type}); 
        }; 
        reader.readAsDataURL(file); 
    }); 
};

window.u_calcAge = function(d) { 
    if(!d) return "-"; 
    var today = new Date(); 
    var birthDate = new Date(d); 
    if(isNaN(birthDate)) return "-"; 
    var age = today.getFullYear() - birthDate.getFullYear(); 
    var m = today.getMonth() - birthDate.getMonth(); 
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } 
    return age + " ปี"; 
};

window.u_formatDate = function(d) { 
    if(!d) return '-'; 
    try { 
        var date = new Date(d); 
        if(isNaN(date.getTime())) return '-'; 
        return date.toLocaleDateString('th-TH-u-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' }); 
    } catch(e) { return '-'; } 
};

window.u_calcTenure = function(dateString) { 
    if(!dateString) return '-'; 
    var start = new Date(dateString); 
    var now = new Date(); 
    start.setHours(0,0,0,0); 
    now.setHours(0,0,0,0); 
    if(isNaN(start.getTime())) return "-"; 
    if (start.getTime() > now.getTime()) { 
        return '<span class="badge bg-warning text-dark border border-warning shadow-sm" style="font-weight:600;">รอเริ่มงาน</span>'; 
    } 
    var years = now.getFullYear() - start.getFullYear(); 
    var months = now.getMonth() - start.getMonth(); 
    var days = now.getDate() - start.getDate(); 
    if (days < 0) { 
        months--; 
        var prevMonth = new Date(now.getFullYear(), now.getMonth(), 0); 
        days += prevMonth.getDate(); 
    } 
    if (months < 0) { 
        years--; 
        months += 12; 
    } 
    var result = []; 
    if (years > 0) result.push(years + " ปี"); 
    if (months > 0) result.push(months + " เดือน"); 
    if (days > 0) result.push(days + " วัน"); 
    if (result.length === 0) return "เริ่มงานวันนี้"; 
    return result.join(" "); 
};

window.u_numberWithCommas = function(x) {
    if (!x && x !== 0) return "0";
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? parts.join(".") : parts[0];
};

window.u_openPreview = function(url) {
    window.open(url, '_blank');
};

window.u_safeDate = function(d) {
    if(!d) return '';
    try {
        var date = new Date(d);
        if(isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch(e) {
        return '';
    }
};

window.u_loadContacts = function() {
    var tab = document.getElementById('u_contactListTab');
    if(!tab) return;
    
    tab.innerHTML = '<div class="text-center text-muted py-5 small"><div class="spinner-border spinner-border-sm text-warning mb-2"></div><br>กำลังโหลดข้อมูลการติดต่อ...</div>';
    
    window.callAPI({ action: 'getContactData' }).then(function(res) {
        if(!res || res.length === 0) {
            tab.innerHTML = '<div class="text-center text-muted py-5 small"><i class="bi bi-telephone-x fs-1 d-block mb-3 opacity-50"></i>ยังไม่มีข้อมูลผู้ติดต่อในระบบ</div>';
            return;
        }

        res.sort(function(a, b) {
            return a.group.localeCompare(b.group, 'th');
        });

        let html = '<div class="row g-3">';
        res.forEach(function(c) {
            let nicknameHtml = (c.nickname && c.nickname !== '-') 
                ? `<span class="text-info fw-bold text-nowrap" style="font-size: 0.85rem; letter-spacing: 0.5px;">${c.nickname}</span>` 
                : `<span class="text-secondary font-monospace text-nowrap" style="font-size: 0.75rem; opacity: 0.6;">${c.empId || ''}</span>`;

            html += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="p-3 rounded-3 h-100 d-flex flex-column justify-content-between shadow-sm position-relative" 
                     style="background: rgba(18, 18, 18, 0.85); border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.2s ease;">
                    <div>
                        <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                            <span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-2 py-1 rounded-pill fw-bold text-start" style="font-size: 0.72rem; white-space: normal; line-height: 1.3;">
                                <i class="bi bi-bookmark-star-fill me-1"></i>${c.group}
                            </span>
                            ${nicknameHtml}
                        </div>
                        <div class="fw-bold text-white mb-1" style="font-size: 1rem; line-height: 1.35;">
                            ${c.name}
                        </div>
                        <div class="text-secondary small mb-3 text-truncate" style="font-size: 0.8rem;" title="${c.position}">
                            <i class="bi bi-briefcase text-warning opacity-75 me-1"></i>${c.position}
                        </div>
                    </div>
                    <a href="tel:${c.phone}" class="btn btn-sm btn-success text-success border border-success border-opacity-25 w-100 rounded-pill fw-bold py-2 shadow-sm d-flex justify-content-center align-items-center hover-scale" 
                       style="background: rgba(25, 135, 84, 0.12) !important; font-size: 0.9rem;">
                        <i class="bi bi-telephone-fill me-2 fs-6"></i>โทร ${c.phone}
                    </a>
                </div>
            </div>`;
        });
        html += '</div>';
        
        tab.innerHTML = html;
        
    }).catch(function(err) {
        tab.innerHTML = '<div class="text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    });
};

window.u_selectMobileTab = function(targetId, titleHtml) {
    var titleEl = document.getElementById('mobileTabTitle');
    if(titleEl) titleEl.innerHTML = titleHtml;
    
    var tabBtn = document.getElementById(targetId);
    if(tabBtn) {
        var tab = new bootstrap.Tab(tabBtn);
        tab.show();
        
        if (targetId === 'tab-btn-contacts') {
            window.u_loadContacts();
        }

        setTimeout(function() {
            var mobileDropdown = document.getElementById('mobileTabBtn');
            if(mobileDropdown) {
                var yOffset = -20; 
                var y = mobileDropdown.getBoundingClientRect().top + window.scrollY + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }, 150);
    }
};