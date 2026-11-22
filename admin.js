window.allContactData = [];

window.showModalSafe = function(modalId) {
    var el = document.getElementById(modalId);
    if (!el) return;
    var modalObj = bootstrap.Modal.getInstance(el);
    if (!modalObj) {
        modalObj = new bootstrap.Modal(el);
    }
    modalObj.show();
};

window.resolveAccidentCause = function(acc) {
    if (!acc) return '-';
    var rawCause = String(acc.cause || '').trim();
    var other = String(acc.causeOther || acc.otherCause || acc.cause_other || acc.causeDetail || '').trim();
    var isOtherPlaceholder = (rawCause === 'อื่นๆ' || rawCause === 'อื่นๆ ระบุ' || rawCause.indexOf('อื่นๆ') === 0);

    if (isOtherPlaceholder) {
        var stripped = rawCause.replace(/^อื่นๆ\s*(ระบุ)?\s*[:\-]?\s*/i, '').trim();
        if (stripped) return stripped;
        if (other && other !== '-') return other;
        var detailFallback = String(acc.detail || '').trim();
        if (detailFallback && detailFallback !== '-') {
            return detailFallback;
        }
        return rawCause || '-';
    }

    if (other && other !== '-' && rawCause.indexOf(other) === -1) {
        return rawCause + ' (' + other + ')';
    }
    return rawCause || '-';
};

window.resolveAccidentCausedBy = function(acc) {
    if (!acc) return '-';
    var rawBy = String(acc.causedBy || '').trim();
    var otherBy = String(acc.causedByOther || acc.otherCausedBy || acc.caused_by_other || '').trim();
    var isOtherPlaceholder = (rawBy === 'อื่นๆ' || rawBy === 'อื่นๆ ระบุ' || rawBy.indexOf('อื่นๆ') === 0);

    if (isOtherPlaceholder) {
        var stripped = rawBy.replace(/^อื่นๆ\s*(ระบุ)?\s*[:\-]?\s*/i, '').trim();
        if (stripped) return stripped;
        if (otherBy && otherBy !== '-') return otherBy;
        return rawBy || '-';
    }

    if (otherBy && otherBy !== '-' && rawBy.indexOf(otherBy) === -1) {
        return rawBy + ' (' + otherBy + ')';
    }
    return rawBy || '-';
};

window.populateEmployeeDatalists = function() {
    if (!window.allEmpData || !Array.isArray(window.allEmpData)) return;
    var activeEmps = window.allEmpData.filter(function(e) { return e.status === 'Active'; });
    var optionsHtml = '';
    activeEmps.forEach(function(e) {
        optionsHtml += '<option value="' + e.id + ' : ' + e.name + ' (' + (e.position || "-") + ')">';
    });

    var warnDatalist = document.getElementById('warnEmpOptions');
    if (warnDatalist) {
        warnDatalist.innerHTML = optionsHtml;
    }

    var contactDatalist = document.getElementById('contactEmpOptions');
    if (contactDatalist) {
        contactDatalist.innerHTML = optionsHtml;
    }
};

window.filterAdminEvalTable = function() {
    var search = (document.getElementById('searchEvalInput') ? document.getElementById('searchEvalInput').value.toLowerCase() : "");
    var filterMonth = document.getElementById('filterEvalMonth') ? document.getElementById('filterEvalMonth').value : "";
    
    var filtered = window.allEvalData || [];
    
    if(filterMonth) {
        filtered = filtered.filter(function(d) { return d.monthYear === filterMonth; });
    }
    if(search) {
        filtered = filtered.filter(function(d) { 
            return (d.driverName + d.evaluatorName + d.comment).toLowerCase().includes(search);
        });
    }
    
    var grouped = {};
    var totalScoreSum = 0;
    var totalValidEvals = 0;
    var naCount = 0;
    
    filtered.forEach(function(r) {
        var key = r.monthYear + "_" + r.driverId;
        if(!grouped[key]) {
            grouped[key] = {
                monthYear: r.monthYear,
                evaluatedId: r.driverId,
                evaluatedName: r.driverName,
                evaluators: [],
                totalScore: 0,
                validCount: 0,
                naCount: 0
            };
        }
        
        grouped[key].evaluators.push(r);
        
        if(r.status === 'ไม่ได้ประสานงาน') {
            grouped[key].naCount++;
            naCount++;
        } else {
            var s = parseFloat(r.score);
            if(!isNaN(s)) {
                grouped[key].totalScore += s;
                grouped[key].validCount++;
                totalScoreSum += s;
                totalValidEvals++;
            }
        }
    });
    
    var html = '';
    var evaluatedKeys = Object.keys(grouped);
    
    if(evaluatedKeys.length === 0) {
        html = '<tr><td colspan="5" class="text-center py-5 text-muted">ไม่พบข้อมูลการประเมิน</td></tr>';
    } else {
        evaluatedKeys.forEach(function(k) {
            var g = grouped[k];
            var avg = g.validCount > 0 ? (g.totalScore / g.validCount).toFixed(2) : "-";
            var avgHtml = g.validCount > 0 ? `<span class="badge bg-success fs-6">${avg} / 10</span>` : `<span class="badge bg-secondary">ไม่มีคะแนน</span>`;
            var totalEvaluators = g.evaluators.length;
            
            var safeJson = encodeURIComponent(JSON.stringify(g));
            
            html += `<tr style="cursor:pointer;" onclick="window.openEvalDetailModal('${safeJson}')">
                <td class="ps-4 text-warning fw-bold">${g.monthYear}</td>
                <td class="text-light fw-bold">${g.evaluatedName}</td>
                <td class="text-center"><span class="badge bg-info text-dark rounded-pill">${totalEvaluators} คน</span></td>
                <td class="text-center">${avgHtml}</td>
                <td class="text-center pe-4">
                    <button class="btn btn-sm btn-outline-success rounded-pill px-3 shadow-sm hover-scale" onclick="event.stopPropagation(); window.openEvalDetailModal('${safeJson}')"><i class="bi bi-search me-1"></i>ตรวจสอบ</button>
                </td>
            </tr>`;
        });
    }
    
    var overallAvg = totalValidEvals > 0 ? (totalScoreSum / totalValidEvals).toFixed(2) : "0.00";
    
    var tb = document.getElementById('adminEvalTableBody');
    if(tb) tb.innerHTML = html;
    
    var stTot = document.getElementById('statEvalTotal');
    if(stTot) stTot.innerText = evaluatedKeys.length; 
    
    var stAvg = document.getElementById('statEvalAvg');
    if(stAvg) stAvg.innerText = overallAvg;
    
    var stNa = document.getElementById('statEvalNA');
    if(stNa) stNa.innerText = naCount;
};

window.openEvalDetailModal = function(jsonStr) {
    var g = JSON.parse(decodeURIComponent(jsonStr));
    var detailNameEl = document.getElementById('detailEvalName');
    if(detailNameEl) detailNameEl.innerText = g.evaluatedName;
    var detailMonthEl = document.getElementById('detailEvalMonth');
    if(detailMonthEl) detailMonthEl.innerText = g.monthYear;
    var detailAvgEl = document.getElementById('detailEvalAvg');
    if(detailAvgEl) detailAvgEl.innerText = g.validCount > 0 ? (g.totalScore / g.validCount).toFixed(2) : "-";
    
    var html = '';
    g.evaluators.forEach(function(ev, idx) {
        var delay = idx * 0.05;
        var scoreHtml = ev.status === 'ไม่ได้ประสานงาน' 
            ? '<span class="admin-modal-badge border-secondary text-secondary">ไม่ได้ประสานงาน</span>'
            : `<span class="admin-modal-badge">${ev.score}/10</span>`;
            
        var commentHtml = ev.comment ? `<div class="mt-2 text-light small fst-italic"><i class="bi bi-chat-quote text-success me-1"></i> "${ev.comment}"</div>` : '';
        var evaluatorNameShort = ev.evaluatorName ? ev.evaluatorName.split(' ')[0] + ' ' + (ev.evaluatorName.split(' ')[1] || '') : '-';
        
        html += `<div class="admin-modal-card static mb-2 stagger-item" style="animation-delay: ${delay}s">
            <div class="w-100">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-info fw-bold"><i class="bi bi-person me-2"></i>${evaluatorNameShort}</span>
                    ${scoreHtml}
                </div>
                ${commentHtml}
            </div>
        </div>`;
    });
    var detailListEl = document.getElementById('evalDetailList');
    if(detailListEl) detailListEl.innerHTML = html;
    window.showModalSafe('evalDetailModal');
};

window.loadAdminData = function() {
    var tbEmp = document.getElementById('tableBody');
    if(tbEmp) tbEmp.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-muted"><div class="spinner-border text-success spinner-border-sm me-2"></div> กำลังโหลดข้อมูล...</td></tr>';
    
    var tbAcc = document.getElementById('adminAccidentTableBody');
    if(tbAcc) tbAcc.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted"><div class="spinner-border text-warning spinner-border-sm me-2"></div> กำลังโหลดข้อมูลอุบัติเหตุ...</td></tr>';
    
    var tbWarn = document.getElementById('adminWarnTableBody');
    if(tbWarn) tbWarn.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted"><div class="spinner-border text-danger spinner-border-sm me-2"></div> กำลังโหลดข้อมูลใบเตือน...</td></tr>';
    
    var tbPay = document.getElementById('adminPayrollTableBody');
    if(tbPay) tbPay.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-muted"><div class="spinner-border text-warning spinner-border-sm me-2"></div> กำลังโหลดข้อมูลพนักงาน...</td></tr>';
    
    var tbEval = document.getElementById('adminEvalTableBody');
    if(tbEval) tbEval.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted"><div class="spinner-border text-success spinner-border-sm me-2"></div> กำลังโหลดข้อมูลประเมิน...</td></tr>';
    
    var tbContact = document.getElementById('adminContactTableBody');
    if(tbContact) tbContact.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted"><div class="spinner-border text-primary spinner-border-sm me-2"></div> กำลังโหลดข้อมูลผู้ติดต่อ...</td></tr>';

    window.callAPI({ 
        action: 'getAccidentData', 
        role: 'Admin', 
        empId: '' 
    }).then(function(accData) {
        window.allAccidentData = accData || []; 
        window.currentAccidentDisplayData = window.allAccidentData;
        
        window.callAPI({ 
            action: 'getWarningData' 
        }).then(function(warnData) {
            window.allWarningData = warnData || []; 
            window.currentWarningDisplayData = window.allWarningData;
            
            window.callAPI({ 
                action: 'getEmployeesByRole', 
                role: window.currentUser.role, 
                userId: window.currentUser.empId 
            }).then(function(data) {
                if (!data || !Array.isArray(data)) data = [];
                window.allEmpData = data; 
                window.currentDisplayData = data;
                
                window.populateEmployeeDatalists();
                
                if(window.currentUser.role !== 'Viewer') { 
                    var els = document.querySelectorAll('.admin-only'); 
                    for(var i=0; i<els.length; i++) els[i].style.display = 'inline-block'; 
                }
                
                window.renderStats(data); 
                window.filterTable(); 
                window.renderAccidentTable(window.currentAccidentDisplayData); 
                window.renderWarningTable(window.currentWarningDisplayData);
                
                window.callAPI({ action: 'getUserPayslips', empId: 'ALL' }).then(function(prData) {
                    window.allPayrollData = prData || [];
                    var posSet = new Set();
                    data.forEach(function(e) { 
                        if(e.status === 'Active' && e.position) { 
                            e.position.split(',').forEach(function(p) { 
                                posSet.add(p.trim()); 
                            }); 
                        }
                    });
                    var posSelect = document.getElementById('filterPayrollPosition');
                    if(posSelect) {
                        posSelect.innerHTML = '<option value="all">🌐 ทุกตำแหน่ง</option>';
                        Array.from(posSet).sort().forEach(function(p) { 
                            posSelect.innerHTML += '<option value="' + p + '">' + p + '</option>'; 
                        });
                    }
                    window.filterPayrollTable();
                });

                window.callAPI({ action: 'getAllEvaluations' }).then(function(evalData) {
                    window.allEvalData = evalData || [];
                    window.filterAdminEvalTable();
                });

                if (typeof window.loadAdminCertData === 'function') {
                    window.loadAdminCertData();
                }

                window.callAPI({ action: 'getContactData' }).then(function(contactData) {
                    window.allContactData = contactData || [];
                    window.renderContactTable();
                    window.populateEmployeeDatalists();
                });
            });
        });
    });
};

window.switchAdminTab = function(tab) {
    var tabs = ['btnTabEmp', 'btnTabAcc', 'btnTabWarn', 'btnTabPayroll', 'btnTabEval', 'btnTabContact', 'btnTabCert'];
    var sections = ['section-admin-emp', 'section-admin-acc', 'section-admin-warn', 'section-admin-payroll', 'section-admin-eval', 'section-admin-contact', 'section-admin-cert'];
    
    tabs.forEach(function(t) { var el = document.getElementById(t); if(el) el.classList.remove('active'); });
    sections.forEach(function(s) { var sec = document.getElementById(s); if(sec) sec.classList.add('d-none'); });
    
    var searchEmp = document.getElementById('searchInput'); if(searchEmp) searchEmp.value = '';
    var searchAcc = document.getElementById('searchAccidentInput'); if(searchAcc) searchAcc.value = '';
    var searchWarn = document.getElementById('searchWarnInput'); if(searchWarn) searchWarn.value = '';
    var searchPay = document.getElementById('searchPayrollInput'); if(searchPay) searchPay.value = '';
    var searchEval = document.getElementById('searchEvalInput'); if(searchEval) searchEval.value = '';
    
    var filterPos = document.getElementById('filterPayrollPosition'); if(filterPos) filterPos.value = 'all';
    var filterStatus = document.getElementById('filterSlipStatus'); if(filterStatus) filterStatus.value = 'all';

    if (tab === 'emp') { 
        document.getElementById('btnTabEmp').classList.add('active'); 
        document.getElementById('section-admin-emp').classList.remove('d-none'); 
        if(window.allEmpData) window.filterTable();
    } else if (tab === 'acc') { 
        document.getElementById('btnTabAcc').classList.add('active'); 
        document.getElementById('section-admin-acc').classList.remove('d-none'); 
        if(window.allAccidentData) window.filterAccidentTable();
    } else if (tab === 'warn') { 
        document.getElementById('btnTabWarn').classList.add('active'); 
        document.getElementById('section-admin-warn').classList.remove('d-none'); 
        if(window.allWarningData) window.filterWarnTable();
        window.populateEmployeeDatalists();
    } else if (tab === 'payroll') {
        document.getElementById('btnTabPayroll').classList.add('active'); 
        document.getElementById('section-admin-payroll').classList.remove('d-none');
        
        var yearSelect = document.getElementById('filterPayrollYear');
        if (yearSelect && yearSelect.options.length === 0) {
            var currentYear = new Date().getFullYear();
            for (var y = currentYear - 2; y <= currentYear + 2; y++) {
                var option = document.createElement('option');
                option.value = y; option.text = y;
                if (y === currentYear) option.selected = true;
                yearSelect.appendChild(option);
            }
        } else if (yearSelect) {
            yearSelect.value = new Date().getFullYear();
        }

        var monthSelect = document.getElementById('filterPayrollMonthSelect');
        if (monthSelect) { monthSelect.value = ("0" + (new Date().getMonth() + 1)).slice(-2); }

        if(window.allEmpData) window.filterPayrollTable(); 
    } else if (tab === 'eval') {
        document.getElementById('btnTabEval').classList.add('active'); 
        document.getElementById('section-admin-eval').classList.remove('d-none'); 
        
        var evalMonthInput = document.getElementById('filterEvalMonth');
        if(evalMonthInput && !evalMonthInput.value) {
            var d = new Date();
            var y = d.getFullYear();
            var m = ("0" + (d.getMonth() + 1)).slice(-2);
            evalMonthInput.value = y + "-" + m;
        }
        if(window.allEvalData) window.filterAdminEvalTable();
    } else if (tab === 'contact') {
        document.getElementById('btnTabContact').classList.add('active'); 
        document.getElementById('section-admin-contact').classList.remove('d-none');
        if(window.allContactData) window.renderContactTable();
        window.populateEmployeeDatalists();
    } else if (tab === 'cert') {
        document.getElementById('btnTabCert').classList.add('active');
        document.getElementById('section-admin-cert').classList.remove('d-none');
        if (typeof window.filterAdminCertTable === 'function') window.filterAdminCertTable();
    }
};

window.renderTable = function(data) {
    var tbody = document.getElementById('tableBody'); 
    if(!tbody) return;
    tbody.innerHTML = '';
    var limitEl = document.getElementById('rowsPerPage');
    var limit = limitEl ? limitEl.value : 'all';
    var list = (limit === 'all') ? data : data.slice(0, parseInt(limit));
    
    var tableFooter = document.getElementById('tableFooter');
    
    if (list.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>'; 
        if(tableFooter) tableFooter.innerText = 'Total: 0'; 
        return; 
    }
    
    list.forEach(function(emp) {
        var badgeClass = 'bg-secondary text-white';
        if (emp.status === 'Active') badgeClass = 'bg-success text-dark'; 
        else if (emp.status === 'Resigned') badgeClass = 'bg-danger text-white'; 
        else if (emp.status === 'Suspended') badgeClass = 'bg-warning text-dark';
        
        var accCount = window.allAccidentData ? window.allAccidentData.filter(function(a) { return String(a.empId).trim() === String(emp.id).trim(); }).length : 0;
        var accBadge = accCount > 0 ? '<span class="badge bg-warning text-dark rounded-pill shadow-sm">' + accCount + ' ครั้ง</span>' : '<span class="text-muted small">-</span>';
        
        var warnCount = window.allWarningData ? window.allWarningData.filter(function(w) { return String(w.empId).trim() === String(emp.id).trim(); }).length : 0;
        var warnBadge = warnCount > 0 ? '<span class="badge bg-danger rounded-pill shadow-sm">' + warnCount + ' ครั้ง</span>' : '<span class="text-muted small">-</span>';
        
        var editBtn = ''; 
        if (window.currentUser && window.currentUser.role !== 'Viewer') { 
            var certDirectBtn = emp.status === 'Active' ? '<button class="btn btn-sm btn-dark border-secondary text-info rounded-circle hover-scale me-1" onclick="event.stopPropagation(); window.openAdminApproveCertModal(null, \'' + emp.id + '\')" title="ออกหนังสือรับรองให้ทันที"><i class="bi bi-file-earmark-check"></i></button>' : '';
            editBtn = certDirectBtn + '<button class="btn btn-sm btn-dark border-secondary text-warning rounded-circle hover-scale" onclick="event.stopPropagation(); window.openModal(\'edit\', \'' + emp.id + '\')" title="แก้ไข"><i class="bi bi-pencil-fill"></i></button>'; 
        }
        
        var docIcon = '<span class="text-muted small opacity-25">-</span>';
        if (emp.docs && Object.keys(emp.docs).length > 0) {
            var menuItems = '';
            var docConfig = [ 
                { key: "SALARY_SLIP", name: "สลิปเงินเดือน", icon: "bi-cash-stack text-warning" },
                { key: "APP_FORM", name: "ใบสมัครงาน", icon: "bi-file-earmark-pdf text-danger" }, 
                { key: "PHOTO", name: "รูปถ่าย", icon: "bi-person-bounding-box" }, 
                { key: "ID_CARD", name: "บัตรประชาชน", icon: "bi-person-vcard" }, 
                { key: "LICENSE", name: "ใบขับขี่", icon: "bi-car-front" }, 
                { key: "EDU_CERT", name: "วุฒิการศึกษา", icon: "bi-mortarboard" }, 
                { key: "HEALTH_CHECK", name: "ใบรับรองแพทย์", icon: "bi-heart-pulse" }
            ];
            var visibleCount = 0;
            docConfig.forEach(function(conf) { 
                if (emp.docs[conf.key] && emp.docs[conf.key].url) { 
                    var bgStyle = visibleCount % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.05)'; 
                    var iconColor = conf.icon.includes('text-') ? conf.icon : conf.icon + ' text-success opacity-75';
                    menuItems += '<li style="background-color: ' + bgStyle + ';"><a class="dropdown-item text-light py-2 d-flex align-items-center gap-2 small" href="' + emp.docs[conf.key].url + '" target="_blank"><i class="bi ' + iconColor + '"></i>' + conf.name + '</a></li>'; 
                    visibleCount++; 
                } 
            });
            if (menuItems !== '') { 
                docIcon = '<div class="dropdown"><button class="btn btn-sm btn-link text-decoration-none text-success p-0 hover-scale" type="button" data-bs-toggle="dropdown"><i class="bi bi-folder2-open fs-5"></i></button><ul class="dropdown-menu dropdown-menu-dark shadow-lg border border-secondary border-opacity-25 p-0 overflow-hidden" style="min-width: 200px;">' + menuItems + '</ul></div>'; 
            }
        }
        
        var ruleBadge = emp.rulesAccepted 
            ? '<span class="text-success" title="ยอมรับแล้ว"><i class="bi bi-check-circle-fill fs-5"></i></span>' 
            : '<span class="text-danger" title="ยังไม่ยอมรับ"><i class="bi bi-x-circle-fill fs-5"></i></span>';

        var ageText = window.calcAge(emp.birthDate); 

        var tr = document.createElement('tr');
        tr.onclick = function(e) { 
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('select')) { 
                window.openModal('view', emp.id, emp); 
            } 
        };
        tr.innerHTML = '<td class="ps-4"><span class="font-monospace text-success fw-bold">' + emp.id + '</span></td>' +
                       '<td><div class="fw-bold text-white">' + emp.name + '</div><div class="small text-secondary" style="font-size:0.75rem;">' + (emp.nickname || '-') + ' | อายุ: ' + ageText + '</div></td>' +
                       '<td><span class="badge bg-dark border border-secondary fw-normal text-secondary px-2">' + (emp.position || '-') + '</span></td>' +
                       '<td class="text-center small text-secondary">' + window.calcTenure(emp.startDate) + '</td>' +
                       '<td class="text-center"><span class="badge rounded-pill ' + badgeClass + ' px-3 shadow-sm">' + emp.status + '</span></td>' +
                       '<td class="text-center">' + ruleBadge + '</td>' +
                       '<td class="text-center">' + accBadge + '</td>' +
                       '<td class="text-center">' + warnBadge + '</td>' +
                       '<td class="text-center">' + docIcon + '</td>' +
                       '<td class="text-end pe-4">' + editBtn + '</td>';
        tbody.appendChild(tr);
    });
    if(tableFooter) tableFooter.innerText = 'แสดง ' + list.length + ' จาก ' + data.length + ' รายการ';
};

window.filterTable = function() { 
    var searchInput = document.getElementById('searchInput');
    var val = searchInput ? searchInput.value.toLowerCase() : ''; 
    var showResignedCheck = document.getElementById('showResignedCheck');
    var showResigned = showResignedCheck ? showResignedCheck.checked : false; 
    
    var filtered = window.allEmpData.filter(function(d) { 
        var matchSearch = (d.name + d.id + d.position + (d.nickname||'')).toLowerCase().includes(val); 
        var matchStatus = showResigned ? true : (d.status === 'Active'); 
        return matchSearch && matchStatus; 
    }); 
    window.currentDisplayData = filtered; 
    window.renderTable(filtered); 
};

window.sortData = function(key) { 
    if (window.currentSort.key === key) window.currentSort.order = window.currentSort.order === 'asc' ? 'desc' : 'asc'; 
    else { window.currentSort.key = key; window.currentSort.order = 'asc'; } 
    
    window.currentDisplayData.sort(function(a, b) { 
        if (key === 'startDate') { 
            var dateA = a.startDate ? new Date(a.startDate).getTime() : 0; 
            var dateB = b.startDate ? new Date(b.startDate).getTime() : 0; 
            return window.currentSort.order === 'asc' ? dateA - dateB : dateB - dateA; 
        } 
        var valA = (a[key] || '').toString(); 
        var valB = (b[key] || '').toString(); 
        return window.currentSort.order === 'asc' ? valA.localeCompare(valB, 'th', { numeric: true }) : valB.localeCompare(valA, 'th', { numeric: true }); 
    }); 
    window.renderTable(window.currentDisplayData); 
};

window.filterPayrollTable = function() {
    if (!window.allEmpData) return;
    var searchEl = document.getElementById('searchPayrollInput');
    var val = searchEl ? searchEl.value.toLowerCase() : ''; 
    
    var posEl = document.getElementById('filterPayrollPosition');
    var posVal = posEl ? posEl.value : 'all';
    
    var yearEl = document.getElementById('filterPayrollYear');
    var yearVal = yearEl ? yearEl.value : new Date().getFullYear().toString();
    
    var monthEl = document.getElementById('filterPayrollMonthSelect');
    var monthVal = monthEl ? monthEl.value : 'all';
    var filterPeriod = monthVal === 'all' ? yearVal : yearVal + "-" + monthVal;
    
    var statusEl = document.getElementById('filterSlipStatus');
    var statusVal = statusEl ? statusEl.value : 'all';

    var empStatusEl = document.getElementById('filterPayrollEmpStatus');
    var empStatusVal = empStatusEl ? empStatusEl.value : 'Active';

    var html = '';
    var totalNet = 0;
    var totalSSO = 0;
    var slipCount = 0;

    var filtered = window.allEmpData.filter(function(d) { 
        var matchStatusFilter = true;
        if (empStatusVal === 'Active') {
            matchStatusFilter = (d.status === 'Active');
        }

        var matchName = (d.name + d.id).toLowerCase().includes(val); 
        var matchPos = (posVal === 'all' || (d.position && d.position.includes(posVal)));
        
        var empSlips = window.allPayrollData ? window.allPayrollData.filter(function(p) { return p.empId === d.id; }) : [];
        var hasSlip = false;
        if (monthVal !== 'all') {
            hasSlip = empSlips.some(function(p) { return p.payMonth === filterPeriod; });
        } else {
            hasSlip = empSlips.some(function(p) { return p.payMonth && p.payMonth.startsWith(yearVal); });
        }

        var matchSlipStatus = true;
        if (statusVal === 'issued') matchSlipStatus = hasSlip;
        if (statusVal === 'pending') matchSlipStatus = !hasSlip;

        return matchStatusFilter && matchName && matchPos && matchSlipStatus;
    }); 
    
    if (filtered.length === 0) {
        html = '<tr><td colspan="8" class="text-center py-5 text-muted">ไม่พบข้อมูลพนักงาน</td></tr>';
    } else {
        filtered.forEach(function(r) {
            var empSlips = window.allPayrollData ? window.allPayrollData.filter(function(p) { return p.empId === r.id; }).sort(function(a,b) { return new Date(b.payDate) - new Date(a.payDate); }) : [];
            
            var matchingSlips = [];
            var currentMonthSlip = null;
            var empPeriodNet = 0;
            var empPeriodSSO = 0;

            if (monthVal !== 'all') {
                currentMonthSlip = empSlips.find(function(p) { return p.payMonth === filterPeriod; });
                if (currentMonthSlip) {
                    slipCount++;
                    empPeriodNet = parseFloat(currentMonthSlip.netSalary) || 0;
                    empPeriodSSO = parseFloat(currentMonthSlip.deducts[1]) || 0; 
                    totalNet += empPeriodNet;
                    totalSSO += (empPeriodSSO * 2); 
                }
            } else {
                matchingSlips = empSlips.filter(function(p) { return p.payMonth && p.payMonth.startsWith(yearVal); });
                slipCount += matchingSlips.length;
                matchingSlips.forEach(function(slip) {
                    var sNet = parseFloat(slip.netSalary) || 0;
                    var sSso = parseFloat(slip.deducts[1]) || 0;
                    empPeriodNet += sNet;
                    empPeriodSSO += sSso;
                    
                    totalNet += sNet;
                    totalSSO += (sSso * 2);
                });
                if(matchingSlips.length > 0) currentMonthSlip = matchingSlips[0]; 
            }

            var slipCountTotal = empSlips.length;
            var baseSal = slipCountTotal > 0 ? empSlips[0].baseSalary : parseFloat(r.appSalary || r.reqSalary || '0');
            
            var badge = slipCountTotal > 0 ? `<button class="btn btn-sm btn-outline-info rounded-pill py-0 px-2" onclick="event.stopPropagation(); window.openPayrollHistory('${r.id}')">${slipCountTotal} เดือน</button>` : `<span class="text-muted small">-</span>`;
            var posShort = r.position || '-';
            
            var rowStyle = currentMonthSlip ? 'background-color: rgba(0, 230, 118, 0.08); border-left: 3px solid #00E676;' : '';
            var statusIcon = currentMonthSlip ? '<i class="bi bi-check-circle-fill text-success ms-2" title="มีข้อมูลตามตัวกรอง"></i>' : '';
            
            var netShow = currentMonthSlip ? window.numberWithCommas(empPeriodNet) : '-';
            var ssoShow = currentMonthSlip ? window.numberWithCommas(empPeriodSSO) : '-';

            html += `<tr style="cursor:pointer; ${rowStyle}" onclick="if(!event.target.closest('button') && !event.target.closest('a')) window.openPayrollHistory('${r.id}')">
                <td class="ps-4 text-warning font-monospace fw-bold">${r.id}</td>
                <td><b class="text-light">${r.name}</b>${statusIcon}</td>
                <td><div style="white-space: normal; word-break: break-word; min-width: 150px;">${posShort}</div></td>
                <td class="text-end text-light fw-bold">${window.numberWithCommas(baseSal)}</td>
                <td class="text-end text-success fw-bold">${netShow}</td>
                <td class="text-end text-info fw-bold">${ssoShow}</td>
                <td class="text-center">${badge}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-warning rounded-pill px-3 shadow-sm hover-scale" onclick="event.stopPropagation(); window.openPayrollModal('${r.id}')"><i class="bi bi-plus-circle me-1"></i>ออกสลิป</button>
                </td>
            </tr>`;
        });
    }
    
    var adminPayrollBody = document.getElementById('adminPayrollTableBody');
    if(adminPayrollBody) adminPayrollBody.innerHTML = html;
    
    var statNetEl = document.getElementById('statPayrollNet');
    if(statNetEl) statNetEl.innerText = window.numberWithCommas(totalNet);
    
    var statSsoEl = document.getElementById('statPayrollSSO');
    if(statSsoEl) statSsoEl.innerText = window.numberWithCommas(totalSSO);
    
    var statCountEl = document.getElementById('statPayrollCount');
    if(statCountEl) statCountEl.innerText = slipCount;
};

window.openPayrollHistory = function(empId) {
    var emp = window.allEmpData.find(function(e) { return e.id === empId; });
    var slips = window.allPayrollData.filter(function(p) { return p.empId === empId; }).sort(function(a,b) { return new Date(b.payDate) - new Date(a.payDate); });
    
    var html = '';
    if (slips.length === 0) {
        html = '<tr><td colspan="6" class="text-center py-4 text-muted">ไม่มีประวัติ</td></tr>';
    } else {
        slips.forEach(function(s) {
            var btnEdit = `<button class="btn btn-sm btn-outline-success rounded-circle me-1" onclick="window.editPayroll('${s.empId}', '${s.payMonth}')" title="ดึงข้อมูลมาแก้ไข"><i class="bi bi-pencil"></i></button>`;
            var btnDel = `<button class="btn btn-sm btn-outline-danger rounded-circle" onclick="window.deletePayslip('${s.empId}', '${s.payMonth}')" title="ลบสลิป"><i class="bi bi-trash"></i></button>`;
            html += `<tr>
                <td class="ps-4">${window.formatDate(s.payDate)}</td>
                <td class="text-end">${window.numberWithCommas(s.totalIncome)}</td>
                <td class="text-end text-danger">${window.numberWithCommas(s.totalDeduct)}</td>
                <td class="text-end text-warning fw-bold">${window.numberWithCommas(s.netSalary)}</td>
                <td class="text-center"><a href="${s.pdfUrl}" target="_blank" class="btn btn-sm btn-secondary py-0 px-2 rounded-pill"><i class="bi bi-eye"></i></a></td>
                <td class="text-center pe-4">${btnEdit}${btnDel}</td>
            </tr>`;
        });
    }
    var historyBody = document.getElementById('payrollHistoryBody');
    if(historyBody) historyBody.innerHTML = html;
    window.showModalSafe('payrollHistoryModal');
};

window.toggleKeepData = function() {
    var empIdEl = document.getElementById('pr_empId');
    if(!empIdEl) return;
    var empId = empIdEl.value;
    var empSlips = window.allPayrollData ? window.allPayrollData.filter(function(p) { return p.empId === empId; }).sort(function(a,b) { return new Date(b.payDate) - new Date(a.payDate); }) : [];
    
    var keepPrev = document.getElementById('keepPrevData');
    if (keepPrev && keepPrev.checked && empSlips.length > 0) {
        var lastM = empSlips[0];
        for (var i=2; i<=10; i++) { 
            var inc = document.getElementById('pr_inc'+i);
            if(inc) inc.value = lastM.incomes[i-1] || 0;
        }
        for (var i=3; i<=10; i++) { 
            var dec = document.getElementById('pr_dec'+i);
            if(dec) dec.value = lastM.deducts[i-1] || 0;
        }
    } else {
        for (var i=2; i<=10; i++) { var inc = document.getElementById('pr_inc'+i); if(inc) inc.value = ''; }
        for (var i=3; i<=10; i++) { var dec = document.getElementById('pr_dec'+i); if(dec) dec.value = ''; }
    }
    window.calcPayrollTotals();
};

window.pullPrevField = function(fieldId) {
    var empIdEl = document.getElementById('pr_empId');
    if(!empIdEl) return;
    var empId = empIdEl.value;
    var empSlips = window.allPayrollData ? window.allPayrollData.filter(function(p) { return p.empId === empId; }).sort(function(a,b) { return new Date(b.payDate) - new Date(a.payDate); }) : [];
    
    if (empSlips.length > 0) {
        var lastM = empSlips[0];
        var val = 0;
        if (fieldId.startsWith('inc')) {
            var idx = parseInt(fieldId.replace('inc', '')) - 1;
            val = lastM.incomes[idx] || 0;
        } else if (fieldId.startsWith('dec')) {
            var idx = parseInt(fieldId.replace('dec', '')) - 1;
            val = lastM.deducts[idx] || 0;
        }
        var fieldEl = document.getElementById('pr_' + fieldId);
        if(fieldEl) fieldEl.value = val;
        window.calcPayrollTotals(); 
    } else {
        Swal.fire({
            toast: true, position: 'top-end', icon: 'info', 
            title: 'ไม่มีประวัติเดือนที่แล้ว', showConfirmButton: false, timer: 1500, background: '#1a1a1a', color: '#fff'
        });
    }
};

window.openPayrollModal = function(empId, isEdit, monthData) {
    if (isEdit === undefined) isEdit = false;
    if (monthData === undefined) monthData = null;
    
    var emp = window.allEmpData.find(function(e){ return String(e.id).trim() === String(empId).trim(); });
    if (!emp) return;
    
    var formEl = document.getElementById('payrollForm');
    if(formEl) formEl.reset();
    
    var prEmpId = document.getElementById('pr_empId'); if(prEmpId) prEmpId.value = emp.id;
    var prEmpName = document.getElementById('pr_empName'); if(prEmpName) prEmpName.innerText = emp.name + " (" + emp.id + ")";
    var prPos = document.getElementById('pr_position'); if(prPos) prPos.value = emp.position || '';
    var prEmail = document.getElementById('pr_email'); if(prEmail) prEmail.value = emp.username + "@vktnexus.com"; 
    
    var parts = emp.name.split(' ');
    var prefix = ""; var fname = ""; var lname = "";
    
    if (parts[0] === 'นาย' || parts[0] === 'นาง' || parts[0] === 'นางสาว') {
        prefix = parts[0]; fname = parts[1] || ''; lname = parts.slice(2).join(' ') || '';
    } else {
        fname = parts[0] || ''; lname = parts.slice(1).join(' ') || '';
    }
    
    var prPrefix = document.getElementById('pr_prefix'); if(prPrefix) prPrefix.value = prefix;
    var prFname = document.getElementById('pr_firstName'); if(prFname) prFname.value = fname;
    var prLname = document.getElementById('pr_lastName'); if(prLname) prLname.value = lname;
    
    var empSlips = window.allPayrollData ? window.allPayrollData.filter(function(p) { return p.empId === empId; }).sort(function(a,b) { return new Date(b.payDate) - new Date(a.payDate); }) : [];

    var keepDataContainer = document.getElementById('keepPrevDataContainer');
    var payDateEl = document.getElementById('pr_payDate');
    var baseSalaryEl = document.getElementById('pr_baseSalary');

    if (isEdit && monthData) {
        if(keepDataContainer) keepDataContainer.style.display = 'none';
        if(payDateEl) payDateEl.value = monthData.payDate.split('T')[0];
        if(baseSalaryEl) baseSalaryEl.value = monthData.baseSalary || 0;
        for (var i=2; i<=10; i++) { 
            var incEl = document.getElementById('pr_inc'+i);
            if(incEl) incEl.value = monthData.incomes[i-1] || 0;
        }
        for (var i=3; i<=10; i++) { 
            var decEl = document.getElementById('pr_dec'+i);
            if(decEl) decEl.value = monthData.deducts[i-1] || 0;
        }
        
        var inc9NameEl = document.getElementById('pr_inc9_name'); if(inc9NameEl) inc9NameEl.value = monthData.inc9Name || "รายได้อื่นๆ 1";
        var inc10NameEl = document.getElementById('pr_inc10_name'); if(inc10NameEl) inc10NameEl.value = monthData.inc10Name || "รายได้อื่นๆ 2";
        var dec9NameEl = document.getElementById('pr_dec9_name'); if(dec9NameEl) dec9NameEl.value = monthData.dec9Name || "ค่างวดรถส่วนตัว";
        var dec10NameEl = document.getElementById('pr_dec10_name'); if(dec10NameEl) dec10NameEl.value = monthData.dec10Name || "ค่าค้างตู้ / อื่นๆ";
        
        var inc9SsoEl = document.getElementById('pr_inc9_sso'); if(inc9SsoEl) inc9SsoEl.checked = monthData.isInc9Sso === true;
        var inc10SsoEl = document.getElementById('pr_inc10_sso'); if(inc10SsoEl) inc10SsoEl.checked = monthData.isInc10Sso === true;

        window.calcPayrollTotals();
        window.showModalSafe('payrollModal');
    } else {
        if(keepDataContainer) keepDataContainer.style.display = 'flex';
        var keepPrevCheck = document.getElementById('keepPrevData');
        if(keepPrevCheck) keepPrevCheck.checked = false; 
        if(payDateEl) payDateEl.valueAsDate = new Date();
        
        var defaultBase = empSlips.length > 0 ? empSlips[0].baseSalary : parseFloat(emp.appSalary || emp.reqSalary || 0);
        if(baseSalaryEl) baseSalaryEl.value = defaultBase;

        for (var i=2; i<=10; i++) { var inc = document.getElementById('pr_inc'+i); if(inc) inc.value = ''; }
        for (var i=3; i<=10; i++) { var dec = document.getElementById('pr_dec'+i); if(dec) dec.value = ''; }
        
        var inc9NameEl = document.getElementById('pr_inc9_name'); if(inc9NameEl) inc9NameEl.value = "รายได้อื่นๆ 1";
        var inc10NameEl = document.getElementById('pr_inc10_name'); if(inc10NameEl) inc10NameEl.value = "รายได้อื่นๆ 2";
        var dec9NameEl = document.getElementById('pr_dec9_name'); if(dec9NameEl) dec9NameEl.value = "ค่างวดรถส่วนตัว";
        var dec10NameEl = document.getElementById('pr_dec10_name'); if(dec10NameEl) dec10NameEl.value = "ค่าค้างตู้ / อื่นๆ";
        
        var inc9SsoEl = document.getElementById('pr_inc9_sso'); if(inc9SsoEl) inc9SsoEl.checked = false;
        var inc10SsoEl = document.getElementById('pr_inc10_sso'); if(inc10SsoEl) inc10SsoEl.checked = false;

        window.calcPayrollTotals();
        window.showModalSafe('payrollModal');
    }
};

window.editPayroll = function(empId, payMonth) {
    var monthData = window.allPayrollData.find(function(p) { return p.empId === empId && p.payMonth === payMonth; });
    if (monthData) {
        var modalInst = bootstrap.Modal.getInstance(document.getElementById('payrollHistoryModal'));
        if(modalInst) modalInst.hide();
        window.openPayrollModal(empId, true, monthData);
    }
};

window.deletePayslip = function(empId, payMonth) {
    Swal.fire({ 
        title: 'ยืนยันการลบสลิป?', 
        text: 'PDF และประวัติเดือนนี้จะถูกลบถาวร', 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#555', 
        confirmButtonText: 'ลบทิ้ง!', 
        cancelButtonText: 'ยกเลิก', 
        background: '#1a1a1a', 
        color: '#fff' 
    }).then(function(result) {
        if (result.isConfirmed) { 
            Swal.fire({title: 'กำลังลบ...', allowOutsideClick: false, background: '#1a1a1a', color: '#fff', didOpen: function() { Swal.showLoading(); }}); 
            window.callAPI({ action: 'deletePayslipRecord', empId: empId, payMonth: payMonth }).then(function(res) { 
                if(res.success) { 
                    Swal.fire({icon: 'success', title: 'ลบสำเร็จ', text: res.message, background: '#1a1a1a', color: '#fff'}); 
                    var modalInst = bootstrap.Modal.getInstance(document.getElementById('payrollHistoryModal'));
                    if(modalInst) modalInst.hide(); 
                    window.loadAdminData(); 
                } else { 
                    Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message, background: '#1a1a1a', color: '#fff'}); 
                } 
            }); 
        }
    });
};

window.calcPayrollTotals = function() {
    var empIdEl = document.getElementById('pr_empId');
    if(!empIdEl) return;
    var empId = empIdEl.value;
    var emp = window.allEmpData.find(function(e) { return String(e.id).trim() === String(empId).trim(); });
    var baseSalEl = document.getElementById('pr_baseSalary');
    var baseSal = baseSalEl ? (parseFloat(baseSalEl.value) || 0) : 0;
    
    var totalManualInc = 0;
    for (var i = 2; i <= 10; i++) {
        var el = document.getElementById('pr_inc'+i);
        if(el) totalManualInc += parseFloat(el.value) || 0;
    }
    var baseGross = baseSal + totalManualInc;

    var inc2 = parseFloat(document.getElementById('pr_inc2') ? document.getElementById('pr_inc2').value : 0) || 0;
    var inc3 = parseFloat(document.getElementById('pr_inc3') ? document.getElementById('pr_inc3').value : 0) || 0;
    var inc4 = parseFloat(document.getElementById('pr_inc4') ? document.getElementById('pr_inc4').value : 0) || 0;
    
    var inc9 = parseFloat(document.getElementById('pr_inc9') ? document.getElementById('pr_inc9').value : 0) || 0;
    var inc10 = parseFloat(document.getElementById('pr_inc10') ? document.getElementById('pr_inc10').value : 0) || 0;
    
    var isInc9Sso = document.getElementById('pr_inc9_sso') && document.getElementById('pr_inc9_sso').checked;
    var isInc10Sso = document.getElementById('pr_inc10_sso') && document.getElementById('pr_inc10_sso').checked;
    
    var extraSsoBase = 0;
    if(isInc9Sso) extraSsoBase += inc9;
    if(isInc10Sso) extraSsoBase += inc10;

    var ssoIncomeBase = baseSal + inc2 + inc3 + inc4 + extraSsoBase;
    
    var ssoAmt = 0;
    if (emp && emp.ssoType && emp.ssoType.indexOf("33") !== -1) {
        var ssoBase = ssoIncomeBase > 17500 ? 17500 : ssoIncomeBase; 
        ssoAmt = Math.round(ssoBase * 0.05);
    }
    
    var prInc1 = document.getElementById('pr_inc1');
    if(prInc1) prInc1.value = ssoAmt;
    
    var prDec2 = document.getElementById('pr_dec2');
    if(prDec2) prDec2.value = ssoAmt; 

    var grossIncome = baseGross + ssoAmt;

    var taxAmt = 0;
    if (emp && emp.position && (emp.position.indexOf("รถร่วม") !== -1 || emp.position.indexOf("รถร่วมบริการ") !== -1)) {
        taxAmt = Math.round(grossIncome * 0.01);
    }
    var prDec1 = document.getElementById('pr_dec1');
    if(prDec1) prDec1.value = taxAmt;

    var totalDec = 0;
    for (var i = 1; i <= 10; i++) {
        var el = document.getElementById('pr_dec'+i);
        if(el) totalDec += parseFloat(el.value) || 0;
    }
    
    var netSalary = grossIncome - totalDec;

    var incShow = document.getElementById('pr_totalIncomeShow'); if(incShow) incShow.innerText = window.numberWithCommas(grossIncome);
    var decShow = document.getElementById('pr_totalDeductShow'); if(decShow) decShow.innerText = window.numberWithCommas(totalDec);
    var netShow = document.getElementById('pr_netSalaryShow'); if(netShow) netShow.innerText = window.numberWithCommas(netSalary);
};

window.submitPayrollForm = function(e) {
    e.preventDefault();
    
    var payload = {
        empId: document.getElementById('pr_empId') ? document.getElementById('pr_empId').value : '',
        payDate: document.getElementById('pr_payDate') ? document.getElementById('pr_payDate').value : '',
        baseSalary: document.getElementById('pr_baseSalary') ? (parseFloat(document.getElementById('pr_baseSalary').value) || 0) : 0,
        prefix: document.getElementById('pr_prefix') ? document.getElementById('pr_prefix').value : '',
        firstName: document.getElementById('pr_firstName') ? document.getElementById('pr_firstName').value : '',
        lastName: document.getElementById('pr_lastName') ? document.getElementById('pr_lastName').value : '',
        position: document.getElementById('pr_position') ? document.getElementById('pr_position').value : '',
        email: document.getElementById('pr_email') ? document.getElementById('pr_email').value : '',
        inc9Name: document.getElementById('pr_inc9_name') && document.getElementById('pr_inc9_name').value !== '' ? document.getElementById('pr_inc9_name').value : 'รายได้อื่นๆ 1',
        inc10Name: document.getElementById('pr_inc10_name') && document.getElementById('pr_inc10_name').value !== '' ? document.getElementById('pr_inc10_name').value : 'รายได้อื่นๆ 2',
        dec9Name: document.getElementById('pr_dec9_name') && document.getElementById('pr_dec9_name').value !== '' ? document.getElementById('pr_dec9_name').value : 'ค่างวดรถส่วนตัว',
        dec10Name: document.getElementById('pr_dec10_name') && document.getElementById('pr_dec10_name').value !== '' ? document.getElementById('pr_dec10_name').value : 'ค่าค้างตู้ / อื่นๆ',
        isInc9Sso: document.getElementById('pr_inc9_sso') && document.getElementById('pr_inc9_sso').checked,
        isInc10Sso: document.getElementById('pr_inc10_sso') && document.getElementById('pr_inc10_sso').checked
    };

    var totalInc = 0;
    var totalDec = 0;
    for (var i=1; i<=10; i++) {
        var incEl = document.getElementById('pr_inc'+i);
        var decEl = document.getElementById('pr_dec'+i);
        var incVal = incEl ? (parseFloat(incEl.value) || 0) : 0;
        var decVal = decEl ? (parseFloat(decEl.value) || 0) : 0;
        payload['inc'+i] = incVal;
        payload['dec'+i] = decVal;
        totalInc += incVal;
        totalDec += decVal;
    }
    
    payload.totalIncome = payload.baseSalary + totalInc;
    payload.totalDeduct = totalDec;
    payload.netSalary = payload.totalIncome - payload.totalDeduct;

    var btn = document.getElementById('btnSubmitPayroll');
    if(!btn) return;
    var originalText = btn.innerText;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังสร้าง PDF...';
    btn.disabled = true;

    window.callAPI({ action: 'generatePayslipNexus', payload: payload }).then(function(res) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        if (res.success) {
            Swal.fire({
                icon: 'success', 
                title: 'ออกสลิปเงินเดือนสำเร็จ', 
                html: `ส่งเข้าโปรไฟล์พนักงานเรียบร้อย<br><a href="${res.url}" target="_blank" class="btn btn-warning mt-3 rounded-pill px-4"><i class="bi bi-file-pdf me-1"></i> ดูสลิปที่สร้าง</a>`,
                background: '#1a1a1a', color: '#fff'
            });
            var modalInst = bootstrap.Modal.getInstance(document.getElementById('payrollModal'));
            if(modalInst) modalInst.hide();
            window.loadAdminData(); 
        } else {
            Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message, background: '#1a1a1a', color: '#fff'});
        }
    }).catch(function(err) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        Swal.fire({icon: 'error', title: 'การเชื่อมต่อล้มเหลว', text: err.toString(), background: '#1a1a1a', color: '#fff'});
    });
};

window.renderAccidentTable = function(data) {
   var accCountEl = document.getElementById('accTotalCount');
   if(accCountEl) accCountEl.innerText = window.allAccidentData.length;
   
   var accCounts = {}; 
   if(window.allAccidentData) {
       window.allAccidentData.forEach(function(a) { accCounts[a.empName] = (accCounts[a.empName] || 0) + 1; });
   }
   var topAccs = Object.keys(accCounts).map(function(k) { return {name:k, count:accCounts[k]}; }).sort(function(a,b) { return b.count - a.count; }).slice(0,10);
   var topAccHtml = '<div class="row g-3">';
   topAccs.forEach(function(c, idx) { 
       var delay = idx * 0.05;
       topAccHtml += `
       <div class="col-sm-6 stagger-item" style="animation-delay: ${delay}s">
           <div class="admin-modal-card static hover-warning">
               <div class="d-flex align-items-center gap-3">
                   <div class="text-warning fw-bold opacity-50" style="width: 20px;">${idx+1}.</div>
                   <div class="admin-modal-title">${c.name}</div>
               </div>
               <div class="admin-modal-badge admin-modal-badge-warning">${c.count} ครั้ง</div>
           </div>
       </div>`; 
   });
   topAccHtml += '</div>';
   
   var accTopCausesListEl = document.getElementById('accTopCausesList');
   if(accTopCausesListEl) accTopCausesListEl.innerHTML = topAccs.length > 0 ? topAccHtml : '<div class="text-center text-muted py-3">ยังไม่มีข้อมูล</div>';
   
   var html = '';
   if(data) {
       data.forEach(function(r) {
           var isResolved = (r.status === 'ปิดงานเรียบร้อย');
           var statClass = r.status === 'รอดำเนินการ' || r.status === 'Pending' ? 'bg-warning text-dark' : (isResolved ? 'bg-success text-white' : 'bg-secondary');
           var statText = r.status === 'Pending' ? 'รอดำเนินการ' : r.status;
           var pdfBtn = r.pdfUrl !== '-' ? '<a href="' + r.pdfUrl + '" target="_blank" onclick="event.stopPropagation()" class="btn btn-sm btn-outline-danger py-0 px-2 me-1 mb-1 shadow-sm"><i class="bi bi-file-pdf"></i> PDF</a>' : '';
           
           var photoHtml = '';
           if (r.photoUrl !== '-') { 
               var photoLinks = r.photoUrl.split(','); 
               photoLinks.forEach(function(link) { 
                   var cleanLink = link.trim(); 
                   if(cleanLink) { 
                       photoHtml += '<button type="button" onclick="event.stopPropagation(); window.openPreview(\'' + cleanLink + '\')" class="btn btn-sm btn-outline-info py-0 px-2 mb-1 me-1 shadow-sm"><i class="bi bi-image"></i></button>'; 
                   } 
               }); 
           }
           var docsHtml = pdfBtn + photoHtml; 
           if(docsHtml === '') docsHtml = '-';
           
           var displayCause = window.resolveAccidentCause(r);
           var displayCausedBy = window.resolveAccidentCausedBy(r);
           var trailerText = (r.trailerPlate && r.trailerPlate !== '-') ? '<br><small class="text-info">หาง: ' + r.trailerPlate + '</small>' : '';
           html += '<tr style="cursor:pointer;" onclick="if(!event.target.closest(\'button\') && !event.target.closest(\'a\')) window.openAccidentDetailByDocNo(\'' + r.docNo + '\')"><td class="ps-4"><span class="text-warning font-monospace">' + r.docNo + '</span><br><span class="badge ' + statClass + ' rounded-pill mt-1" style="font-size: 0.65rem;">' + statText + '</span></td><td><b class="text-light">' + r.empName + '</b><br><small class="text-muted">' + r.empId + '</small></td><td>' + r.accDate + '<br><small class="text-muted">' + r.accTime + '</small></td><td><div class="text-truncate text-light" style="max-width:150px;" title="' + r.location + '">' + r.location + '</div></td><td>' + r.vehType + '<br><small class="text-muted">หัว: ' + r.truckPlate + '</small>' + trailerText + '</td><td><div class="text-danger" style="max-width:200px; white-space:normal;">' + displayCause + '</div><small class="text-muted">' + displayCausedBy + '</small></td><td class="text-center pe-4">' + docsHtml + '</td></tr>';
       });
   }
   var tableBody = document.getElementById('adminAccidentTableBody');
   if(tableBody) tableBody.innerHTML = html || '<tr><td colspan="7" class="text-center py-4 text-muted">ไม่พบข้อมูลอุบัติเหตุ</td></tr>';
};

window.filterAccidentTable = function() { 
    var searchInput = document.getElementById('searchAccidentInput');
    if(!searchInput) return;
    var val = searchInput.value.toLowerCase(); 
    window.currentAccidentDisplayData = window.allAccidentData.filter(function(d) { 
        return (d.docNo + d.empName + d.empId).toLowerCase().includes(val); 
    }); 
    window.renderAccidentTable(window.currentAccidentDisplayData); 
};

window.openAccidentDetailByDocNo = function(docNo) {
    var data = window.allAccidentData.find(function(a) { return a.docNo === docNo; }); 
    if (!data) return;
    
    var mDocNo = document.getElementById('m_accDocNo'); if(mDocNo) mDocNo.innerText = data.docNo; 
    var mDocNoHidden = document.getElementById('m_accDocNoHidden'); if(mDocNoHidden) mDocNoHidden.value = data.docNo; 
    var mEmpName = document.getElementById('m_accEmpName'); if(mEmpName) mEmpName.innerText = data.empName + " (" + data.empId + ")"; 
    var mDateTime = document.getElementById('m_accDateTime'); if(mDateTime) mDateTime.innerText = data.accDate + " เวลา " + data.accTime;
    
    var trailerInfo = (data.trailerPlate && data.trailerPlate !== '-') ? (" หาง: " + data.trailerPlate) : "";
    var mVehicle = document.getElementById('m_accVehicle'); if(mVehicle) mVehicle.innerText = data.vehType + " ทะเบียนหัว: " + data.truckPlate + trailerInfo; 
    var mCause = document.getElementById('m_accCause'); if(mCause) mCause.innerText = window.resolveAccidentCause(data); 
    var mLocation = document.getElementById('m_accLocation'); if(mLocation) mLocation.value = data.location; 
    var mDamage = document.getElementById('m_accDamage'); if(mDamage) mDamage.value = data.damage; 
    var mDetail = document.getElementById('m_accDetail'); if(mDetail) mDetail.value = data.detail;
    
    var stat = data.status === 'Pending' ? 'รอดำเนินการ' : data.status; 
    var mStatus = document.getElementById('m_accStatus'); if(mStatus) mStatus.value = stat; 
    var mFix = document.getElementById('m_accFix'); if(mFix) mFix.value = data.fixText || ""; 
    var mPrevent = document.getElementById('m_accPrevent'); if(mPrevent) mPrevent.value = data.preventText || "";
    
    window.showModalSafe('accidentDetailModal');
};

window.saveAccidentResolution = function() {
    var payload = { 
        docNo: document.getElementById('m_accDocNoHidden') ? document.getElementById('m_accDocNoHidden').value : '', 
        status: document.getElementById('m_accStatus') ? document.getElementById('m_accStatus').value : '', 
        fixText: document.getElementById('m_accFix') ? document.getElementById('m_accFix').value : '', 
        preventText: document.getElementById('m_accPrevent') ? document.getElementById('m_accPrevent').value : '', 
        location: document.getElementById('m_accLocation') ? document.getElementById('m_accLocation').value : '', 
        damage: document.getElementById('m_accDamage') ? document.getElementById('m_accDamage').value : '', 
        detail: document.getElementById('m_accDetail') ? document.getElementById('m_accDetail').value : '' 
    };
    if(!payload.docNo) return;
    
    Swal.fire({title: 'กำลังบันทึกและสร้าง PDF ใหม่...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); }});
    
    window.callAPI({ action: 'updateAccidentResolution', payload: payload }).then(function(res) { 
        if (res.success) { 
            Swal.fire({icon: 'success', title: 'สำเร็จ', text: res.message}); 
            var mod = bootstrap.Modal.getInstance(document.getElementById('accidentDetailModal'));
            if(mod) mod.hide(); 
            window.loadAdminData(); 
        } else { 
            Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message}); 
        } 
    });
};

window.deleteAccident = function() {
    var docNoEl = document.getElementById('m_accDocNoHidden');
    var docNo = docNoEl ? docNoEl.value : ''; 
    if(!docNo) return;
    
    Swal.fire({ 
        title: 'ยืนยันการลบ?', 
        text: 'ต้องการลบรายงานอุบัติเหตุเลขที่ ' + docNo + ' ใช่หรือไม่?', 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#555', 
        confirmButtonText: 'ใช่, ลบทิ้ง!', 
        cancelButtonText: 'ยกเลิก' 
    }).then(function(result) {
        if (result.isConfirmed) { 
            Swal.fire({title: 'กำลังลบ...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); }}); 
            window.callAPI({ action: 'deleteAccidentRecord', docNo: docNo }).then(function(res) { 
                if (res.success) { 
                    Swal.fire({icon: 'success', title: 'ลบสำเร็จ', text: res.message}); 
                    var mod = bootstrap.Modal.getInstance(document.getElementById('accidentDetailModal'));
                    if(mod) mod.hide(); 
                    window.loadAdminData(); 
                } else { 
                    Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message}); 
                } 
            }); 
        }
    });
};

window.renderWarningTable = function(data) {
   var warnCountEl = document.getElementById('warnTotalCount');
   if(warnCountEl) warnCountEl.innerText = window.allWarningData.length;
   
   var warnCounts = {}; 
   if(window.allWarningData) {
       window.allWarningData.forEach(function(w) { warnCounts[w.empName] = (warnCounts[w.empName] || 0) + 1; });
   }
   var topWarns = Object.keys(warnCounts).map(function(k) { return {name:k, count:warnCounts[k]}; }).sort(function(a,b) { return b.count - a.count; }).slice(0,10);
   
   var topHtml = '<div class="d-flex flex-column gap-2">'; 
   topWarns.forEach(function(c, idx) { 
       var delay = idx * 0.05;
       topHtml += `
       <div class="admin-modal-card static hover-danger stagger-item" style="animation-delay: ${delay}s">
           <div class="d-flex align-items-center gap-3">
               <div class="text-danger fw-bold opacity-50" style="width: 20px;">${idx+1}.</div>
               <div class="admin-modal-title">${c.name}</div>
           </div>
           <div class="admin-modal-badge admin-modal-badge-danger">${c.count} ครั้ง</div>
       </div>`; 
   }); 
   topHtml += '</div>';
   
   var warnTopEmpEl = document.getElementById('warnTopEmployeesList');
   if(warnTopEmpEl) warnTopEmpEl.innerHTML = topWarns.length > 0 ? topHtml : '<div class="text-center text-muted py-3">ยังไม่มีข้อมูล</div>';
   
   var html = '';
   if(data) {
       data.forEach(function(r) {
           var pdfBtn = r.pdfUrl && r.pdfUrl.indexOf('http') > -1 ? '<a href="' + r.pdfUrl + '" target="_blank" onclick="event.stopPropagation()" class="btn btn-sm btn-outline-danger py-0 px-3 rounded-pill shadow-sm"><i class="bi bi-file-pdf me-1"></i> เปิดดู</a>' : '-';
           html += '<tr style="cursor:pointer;" onclick="if(!event.target.closest(\'button\') && !event.target.closest(\'a\')) window.openWarningDetailByDocNo(\'' + r.docNo + '\')"><td class="ps-4"><span class="text-danger font-monospace fw-bold">' + r.docNo + '</span></td><td><b class="text-light">' + r.empName + '</b><br><small class="text-muted">' + r.empId + '</small></td><td>' + (r.issueDate.split(' ')[0] || r.issueDate) + '</td><td>' + (r.incidentDate.split(' ')[0] || r.incidentDate) + '</td><td><div class="text-truncate text-light" style="max-width:200px;" title="' + r.offense1 + '">' + r.offense1 + '</div></td><td class="text-center pe-4">' + pdfBtn + '</td></tr>';
       });
   }
   var warnBody = document.getElementById('adminWarnTableBody');
   if(warnBody) warnBody.innerHTML = html || '<tr><td colspan="6" class="text-center py-4 text-muted">ยังไม่มีข้อมูลการออกใบเตือน</td></tr>';
};

window.filterWarnTable = function() { 
    var searchInput = document.getElementById('searchWarnInput');
    if(!searchInput) return;
    var val = searchInput.value.toLowerCase(); 
    window.currentWarningDisplayData = window.allWarningData.filter(function(d) { 
        return (d.docNo + d.empName + d.empId).toLowerCase().includes(val); 
    }); 
    window.renderWarningTable(window.currentWarningDisplayData); 
};

window.openWarningDetailByDocNo = function(docNo) {
    var data = window.allWarningData.find(function(a) { return a.docNo === docNo; }); 
    if(!data) return;

    var el = document.getElementById('e_warnDocNo');
    if(!el) return;

    el.innerText = data.docNo; 
    var docNoHidden = document.getElementById('e_warnDocNoHidden'); if(docNoHidden) docNoHidden.value = data.docNo; 
    var empNameEl = document.getElementById('e_warnEmpName'); if(empNameEl) empNameEl.innerText = data.empName + " (" + data.empId + ")";
    
    var issuedByShort = data.issuedBy.split('(')[0].trim(); 
    var issueByText = document.getElementById('e_warnIssuedByText'); if(issueByText) issueByText.innerText = issuedByShort;

    var issueDateEl = document.getElementById('e_warnIssueDate'); if(issueDateEl) issueDateEl.value = data.issueDateEdit; 
    var incidentDateEl = document.getElementById('e_warnIncidentDate'); if(incidentDateEl) incidentDateEl.value = data.incidentDateEdit; 
    var attachmentsEl = document.getElementById('e_warnAttachments'); if(attachmentsEl) attachmentsEl.value = data.attachments; 
    var off1El = document.getElementById('e_warnOffense1'); if(off1El) off1El.value = data.offense1; 
    var off2El = document.getElementById('e_warnOffense2'); if(off2El) off2El.value = data.offense2; 
    var notesEl = document.getElementById('e_warnNotes'); if(notesEl) notesEl.value = data.notes;

    var select = document.getElementById('e_warnIssuedBy'); 
    if(select) {
        for(var i=0; i<select.options.length; i++) { 
            if (select.options[i].value.includes(issuedByShort)) { 
                select.selectedIndex = i; 
                break; 
            } 
        }
    }
    window.showModalSafe('warningDetailModal');
};

window.saveWarningResolution = function() {
    var payload = { 
        docNo: document.getElementById('e_warnDocNoHidden') ? document.getElementById('e_warnDocNoHidden').value : '', 
        issueDate: document.getElementById('e_warnIssueDate') ? document.getElementById('e_warnIssueDate').value : '', 
        incidentDate: document.getElementById('e_warnIncidentDate') ? document.getElementById('e_warnIncidentDate').value : '', 
        attachments: document.getElementById('e_warnAttachments') ? document.getElementById('e_warnAttachments').value : '', 
        offense1: document.getElementById('e_warnOffense1') ? document.getElementById('e_warnOffense1').value : '', 
        offense2: document.getElementById('e_warnOffense2') ? document.getElementById('e_warnOffense2').value : '', 
        notes: document.getElementById('e_warnNotes') ? document.getElementById('e_warnNotes').value : '', 
        issuedBy: document.getElementById('e_warnIssuedBy') ? document.getElementById('e_warnIssuedBy').value : '' 
    };
    if(!payload.docNo) return;

    Swal.fire({title: 'กำลังบันทึกและสร้าง PDF ใหม่...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); }});

    window.callAPI({ action: 'updateWarningResolution', payload: payload }).then(function(res) { 
        if (res.success) { 
            Swal.fire({icon: 'success', title: 'สำเร็จ', text: res.message}); 
            var mod = bootstrap.Modal.getInstance(document.getElementById('warningDetailModal'));
            if(mod) mod.hide(); 
            window.loadAdminData(); 
        } else { 
            Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message}); 
        } 
    });
};

window.deleteWarning = function() {
    var docNoEl = document.getElementById('e_warnDocNoHidden');
    var docNo = docNoEl ? docNoEl.value : ''; 
    if(!docNo) return;

    Swal.fire({ 
        title: 'ยืนยันการลบ?', 
        text: 'ต้องการลบใบเตือนเลขที่ ' + docNo + ' ใช่หรือไม่? (PDF และข้อมูลจะถูกลบออกทั้งหมด)', 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#555', 
        confirmButtonText: 'ใช่, ลบทิ้ง!', 
        cancelButtonText: 'ยกเลิก' 
    }).then(function(result) {
        if (result.isConfirmed) { 
            Swal.fire({title: 'กำลังลบ...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); }}); 
            window.callAPI({ action: 'deleteWarningRecord', docNo: docNo }).then(function(res) { 
                if(res.success) { 
                    Swal.fire({icon: 'success', title: 'ลบสำเร็จ', text: res.message}); 
                    var mod = bootstrap.Modal.getInstance(document.getElementById('warningDetailModal'));
                    if(mod) mod.hide(); 
                    window.loadAdminData(); 
                } else { 
                    Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message}); 
                } 
            }); 
        }
    });
};

window.openCreateWarningModal = function() { 
    var form = document.getElementById('warningForm'); 
    if (!form) return;
    form.reset(); 
    
    window.populateEmployeeDatalists();
    
    var issueDate = document.getElementById('warnIssueDate');
    if(issueDate) issueDate.valueAsDate = new Date(); 
    var incidentDate = document.getElementById('warnIncidentDate');
    if(incidentDate) incidentDate.valueAsDate = new Date(); 
    
    window.showModalSafe('warningCreateModal');
};

window.getBase64Warn = function(file) { 
    return new Promise(function(resolve) { 
        var reader = new FileReader(); 
        reader.onload = function() { resolve({base64: reader.result.split(',')[1], type: file.type}); }; 
        reader.readAsDataURL(file); 
    }); 
};

window.submitWarningForm = async function(e) {
    e.preventDefault(); 
    var inputEl = document.getElementById('warnEmpInput');
    var inputValue = inputEl ? inputEl.value : ''; 
    if (!inputValue || inputValue.indexOf(':') === -1) { 
        Swal.fire({icon: 'warning', title: 'ข้อมูลไม่ถูกต้อง', text: 'กรุณาเลือกพนักงานจากรายชื่อที่กำหนด'}); 
        return; 
    }
    
    var btn = document.getElementById('btnSubmitWarning'); 
    if(!btn) return;
    var originalText = btn.innerText; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังสร้าง PDF...'; 
    btn.disabled = true;

    var parts = inputValue.split(':'); 
    var empIdValue = parts[0].trim(); 
    var empNameText = parts[1] ? parts[1].trim() : ''; 
    if (empNameText) empNameText = empNameText.split('(')[0].trim();

    var file1El = document.getElementById('warnPhoto1');
    var file2El = document.getElementById('warnPhoto2');
    var file1 = file1El ? file1El.files[0] : null; 
    var file2 = file2El ? file2El.files[0] : null; 
    var b64_1 = null, type1 = null; 
    var b64_2 = null, type2 = null;

    if (file1) { var data1 = await window.getBase64Warn(file1); b64_1 = data1.base64; type1 = data1.type; } 
    if (file2) { var data2 = await window.getBase64Warn(file2); b64_2 = data2.base64; type2 = data2.type; }

    var payload = { 
        empId: empIdValue, 
        empName: empNameText, 
        issueDate: document.getElementById('warnIssueDate') ? document.getElementById('warnIssueDate').value : '', 
        incidentDate: document.getElementById('warnIncidentDate') ? document.getElementById('warnIncidentDate').value : '', 
        attachments: document.getElementById('warnAttachments') ? document.getElementById('warnAttachments').value : '', 
        offense1: document.getElementById('warnOffense1') ? document.getElementById('warnOffense1').value : '', 
        offense2: document.getElementById('warnOffense2') ? document.getElementById('warnOffense2').value : '', 
        notes: document.getElementById('warnNotes') ? document.getElementById('warnNotes').value : '', 
        issuedBy: document.getElementById('warnIssuedBy') ? document.getElementById('warnIssuedBy').value : '', 
        warnPhoto1Base64: b64_1, warnPhoto1Type: type1, 
        warnPhoto2Base64: b64_2, warnPhoto2Type: type2 
    };

    window.callAPI({ action: 'submitWarningReport', form: payload }).then(function(res) { 
        btn.innerHTML = originalText; 
        btn.disabled = false; 
        if (res.success) { 
            Swal.fire({icon: 'success', title: 'สร้างใบเตือนสำเร็จ', html: 'ส่งเข้าประวัติพนักงานเรียบร้อย<br>เลขที่อ้างอิง: <b class="text-danger">' + res.docNo + '</b>'}); 
            var mod = bootstrap.Modal.getInstance(document.getElementById('warningCreateModal'));
            if(mod) mod.hide(); 
            window.loadAdminData(); 
        } else { 
            Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message}); 
        } 
    });
};

window.renderStats = function(data) { 
    var active = data.filter(function(d) { return d.status === 'Active'; }); 
    var statTotalEl = document.getElementById('statTotal');
    if(statTotalEl) statTotalEl.innerText = active.length; 
    
    var male = active.filter(function(d) { return d.gender === 'ชาย'; }).length; 
    var female = active.filter(function(d) { return d.gender === 'หญิง'; }).length; 
    var statMaleEl = document.getElementById('statMale'); if(statMaleEl) statMaleEl.innerText = male; 
    var statFemaleEl = document.getElementById('statFemale'); if(statFemaleEl) statFemaleEl.innerText = female; 
    
    var thisMonth = new Date().getMonth() + 1; 
    var bdays = active.filter(function(d) { 
        if (!d.birthDate) return false; 
        try { return (new Date(d.birthDate).getMonth() + 1) === thisMonth; } catch(e){ return false; } 
    }); 
    var statBirthEl = document.getElementById('statBirth'); if(statBirthEl) statBirthEl.innerText = bdays.length; 
};

window.openBirthdayModal = function() { 
    var thisMonth = new Date().getMonth() + 1; 
    var list = window.allEmpData.filter(function(d) { return d.status === 'Active' && d.birthDate && (new Date(d.birthDate).getMonth() + 1) === thisMonth; }); 
    list.sort(function(a,b) { return new Date(a.birthDate).getDate() - new Date(b.birthDate).getDate(); }); 
    
    var html = '<div class="row g-3">'; 
    if (list.length === 0) {
        html = '<div class="col-12 text-center text-muted py-4">เดือนนี้ไม่มีวันเกิดพนักงาน</div>'; 
    } else { 
        list.forEach(function(e, idx) { 
            var delay = idx * 0.05;
            var day = new Date(e.birthDate).getDate();   
            var nick = e.nickname ? ` <span class="text-warning">(${e.nickname})</span>` : '';
            var pos = e.position ? e.position.replace(/,/g, ', ') : '-';
            
            html += `
            <div class="col-md-6 stagger-item" style="animation-delay: ${delay}s">
                <div class="admin-modal-card hover-warning h-100 p-3" onclick="window.openModal('view', '${e.id}')">
                    <div class="d-flex align-items-start gap-3 w-100">
                        <div class="admin-modal-badge admin-modal-badge-warning d-flex flex-column align-items-center justify-content-center flex-shrink-0 shadow-sm" style="width: 50px; height: 50px; padding: 0; border-radius: 12px;">
                            <span style="font-size: 0.65rem; opacity: 0.8; line-height: 1; margin-bottom: 2px;">วันที่</span>
                            <span style="font-size: 1.3rem; font-weight: bold; line-height: 1;">${day}</span>
                        </div>
                        
                        <div class="flex-grow-1" style="min-width: 0;">
                            <div class="admin-modal-title mb-1" style="font-size: 0.95rem; white-space: normal; line-height: 1.3;">
                                ${e.name}${nick}
                            </div>
                            <div class="text-info font-monospace mb-1" style="font-size: 0.8rem;">
                                <i class="bi bi-person-vcard me-1"></i>${e.id}
                            </div>
                            <div class="admin-modal-subtitle text-light opacity-75" style="font-size: 0.8rem; white-space: normal; line-height: 1.4;">
                                <i class="bi bi-briefcase me-1"></i>${pos}
                            </div>
                        </div>
                        
                        <i class="bi bi-chevron-right text-muted fs-5 ms-1 mt-2 flex-shrink-0"></i>
                    </div>
                </div>
            </div>`; 
        }); 
        html += '</div>';
    } 
    var bodyEl = document.getElementById('birthdayListBody');
    if(bodyEl) bodyEl.innerHTML = html; 
    window.showModalSafe('birthdayModal'); 
};

window.openPositionStatsModal = function() { 
    var stats = {}; 
    window.allEmpData.filter(function(d) { return d.status === 'Active'; }).forEach(function(row) { 
        if (row.position) { 
            if (row.position.includes("รถร่วมบริการ")) { 
                var k = "รถร่วมบริการ"; stats[k] = (stats[k] || 0) + 1; 
            } else { 
                row.position.split(',').forEach(function(p) { var cp = p.trim(); if(cp) stats[cp] = (stats[cp] || 0) + 1; }); 
            } 
        } 
    }); 
    var sorted = Object.keys(stats).map(function(k) { return {n:k, c:stats[k]}; }).sort(function(a,b) { return b.c - a.c; }); 
    
    var html = '<div class="row g-3">'; 
    sorted.forEach(function(i, idx) { 
        var delay = idx * 0.05;
        html += `
        <div class="col-md-6 stagger-item" style="animation-delay: ${delay}s">
            <div class="admin-modal-card h-100" onclick="window.openPositionDetail('${i.n}')">
                <div class="admin-modal-title" style="white-space: normal; word-break: break-word;">${i.n}</div>
                <div class="admin-modal-badge ms-2 flex-shrink-0">${i.c}</div>
            </div>
        </div>`; 
    }); 
    html += '</div>';
    
    var pList = document.getElementById('positionStatsList');
    if(pList) pList.innerHTML = html; 
    window.showModalSafe('positionStatsModal'); 
};

window.openPositionDetail = function(pos) { 
    var list = window.allEmpData.filter(function(d) { return d.status === 'Active' && d.position && d.position.includes(pos); }); 
    
    var html = '<div class="d-flex flex-column gap-2">'; 
    list.forEach(function(e, idx) { 
        var delay = idx * 0.05;
        html += `
        <div class="admin-modal-card hover-info stagger-item" style="animation-delay: ${delay}s">
            <div>
                <div class="admin-modal-title">${e.name}</div>
                <div class="admin-modal-subtitle text-info font-monospace mt-1"><i class="bi bi-telephone me-1"></i>${e.phone || '-'}</div>
            </div>
            <button class="admin-modal-icon-btn" onclick="event.stopPropagation(); window.openModal('view', '${e.id}')" title="ดูโปรไฟล์"><i class="bi bi-search"></i></button>
        </div>`; 
    }); 
    html += '</div>';
    
    var pTitle = document.getElementById('positionDetailTitle'); if(pTitle) pTitle.innerHTML = `<i class="bi bi-diagram-3 me-2"></i>ตำแหน่ง: ${pos}`; 
    var pList = document.getElementById('positionDetailList'); if(pList) pList.innerHTML = html || '<div class="text-center text-muted">ไม่พบข้อมูล</div>'; 
    window.showModalSafe('positionDetailModal'); 
};

window.openYearlyStatsModal = function() { 
    var yearMap = {}; 
    window.allEmpData.forEach(function(d) { 
        if (d.startDate && !isNaN(new Date(d.startDate))) { var y = new Date(d.startDate).getFullYear(); if(!yearMap[y]) yearMap[y]={j:0,r:0}; yearMap[y].j++; } 
        if (d.status === 'Resigned' && d.resignDate && !isNaN(new Date(d.resignDate))) { var y2 = new Date(d.resignDate).getFullYear(); if(!yearMap[y2]) yearMap[y2]={j:0,r:0}; yearMap[y2].r++; } 
    }); 
    var html = '', cum = 0; 
    Object.keys(yearMap).sort().forEach(function(y, idx) { 
        var d = yearMap[y]; cum += (d.j - d.r); 
        var delay = idx * 0.05;
        html += `
        <tr class="stagger-item" style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.2s; animation-delay: ${delay}s" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
            <td class="py-3 text-light fw-bold fs-6">${y}</td>
            <td class="py-3"><span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-2 cursor-pointer hover-scale fs-6" onclick="window.openYearDetail('${y}','join')">+${d.j}</span></td>
            <td class="py-3"><span class="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50 px-3 py-2 cursor-pointer hover-scale fs-6" onclick="window.openYearDetail('${y}','resign')">-${d.r}</span></td>
            <td class="py-3 text-white fw-bold fs-6">${cum}</td>
        </tr>`; 
    }); 
    var bModal = document.getElementById('yearStatsBodyModal'); if(bModal) bModal.innerHTML = html; 
    window.showModalSafe('yearlyStatsModal'); 
};

window.openYearDetail = function(year, type) { 
    var list = []; var title = ""; 
    var icon = ""; var colorClass = "";
    
    if (type === 'join') { 
        icon = '<i class="bi bi-person-plus-fill me-2"></i>';
        colorClass = 'text-success';
        title = `เข้าใหม่ ปี ${year}`; 
        list = window.allEmpData.filter(function(d) { return d.startDate && new Date(d.startDate).getFullYear() == year; }); 
    } else if (type === 'resign') { 
        icon = '<i class="bi bi-person-dash-fill me-2"></i>';
        colorClass = 'text-danger';
        title = `ลาออก ปี ${year}`; 
        list = window.allEmpData.filter(function(d) { return d.status === 'Resigned' && d.resignDate && new Date(d.resignDate).getFullYear() == year; }); 
    } 
    
    var html = '<div class="d-flex flex-column gap-2">'; 
    list.forEach(function(e, idx) { 
        var delay = idx * 0.05;
        var dateDisplay = window.formatDate(type === 'join' ? e.startDate : e.resignDate);
        var badgeColor = type === 'join' ? 'admin-modal-badge' : 'admin-modal-badge admin-modal-badge-danger';
        var hoverClass = type === 'join' ? 'hover-info' : 'hover-danger';
        html += `
        <div class="admin-modal-card ${hoverClass} stagger-item" style="animation-delay: ${delay}s" onclick="window.openModal('view','${e.id}')">
            <div class="overflow-hidden pe-2">
                <div class="admin-modal-title text-truncate">${e.name}</div>
                <div class="admin-modal-subtitle text-truncate">${e.position}</div>
            </div>
            <div class="${badgeColor} flex-shrink-0" style="font-size:0.75rem;">${dateDisplay}</div>
        </div>`; 
    }); 
    html += '</div>';
    
    var dTitle = document.getElementById('yearDetailTitle'); 
    if(dTitle) {
        dTitle.innerHTML = icon + title;
        dTitle.className = `modal-title fw-bold fs-6 ${colorClass}`;
    }
    var dList = document.getElementById('yearDetailList'); if(dList) dList.innerHTML = html || '<div class="text-center text-muted py-4">ไม่พบข้อมูล</div>'; 
    window.showModalSafe('yearDetailModal'); 
};

window.renderContactTable = function() {
    var countEl = document.getElementById('contactTotalCount');
    if(countEl) countEl.innerText = window.allContactData ? window.allContactData.length : 0;
    
    var tbody = document.getElementById('adminContactTableBody');
    if(!tbody) return;
    
    if(!window.allContactData || window.allContactData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">ยังไม่มีรายชื่อติดต่อในระบบ</td></tr>';
        return;
    }
    
    var html = '';
    window.allContactData.forEach(function(c) {
        html += `
        <tr>
            <td class="ps-4"><span class="badge bg-warning text-dark px-3 py-2 rounded-pill shadow-sm">${c.group}</span></td>
            <td><span class="font-monospace text-info">${c.empId}</span></td>
            <td class="text-light fw-bold">${c.name}</td>
            <td class="text-secondary small">${c.position}</td>
            <td class="font-monospace text-success">${c.phone}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-info rounded-pill px-3 shadow-sm hover-scale" onclick="window.openContactModal('${c.group}', '${c.empId}')">
                    <i class="bi bi-pencil-square me-1"></i>แก้ไข
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
};

window.openContactModal = function(group, empId) {
    var form = document.getElementById('contactForm');
    if(form) form.reset();
    
    window.populateEmployeeDatalists();
    
    var btnDelete = document.getElementById('btnDeleteContact');
    
    if(group && empId) {
        document.getElementById('c_oldGroup').value = group;
        document.getElementById('c_oldEmpId').value = empId;
        document.getElementById('c_groupName').value = group;
        
        var empData = window.allEmpData.find(function(e) { return e.id === empId; });
        if(empData) {
            document.getElementById('c_empInput').value = empData.id + " : " + empData.name + " (" + (empData.position || "-") + ")";
        } else {
            document.getElementById('c_empInput').value = empId;
        }
        if(btnDelete) btnDelete.style.display = 'inline-block';
    } 
    else {
        document.getElementById('c_oldGroup').value = '';
        document.getElementById('c_oldEmpId').value = '';
        if(btnDelete) btnDelete.style.display = 'none';
    }
    
    window.showModalSafe('contactModal');
};

window.saveContact = function(e) {
    e.preventDefault();
    var inputEl = document.getElementById('c_empInput');
    var inputValue = inputEl ? inputEl.value : ''; 
    if (!inputValue || inputValue.indexOf(':') === -1) { 
        Swal.fire({icon: 'warning', title: 'ข้อมูลไม่ถูกต้อง', text: 'กรุณาเลือกพนักงานจากรายชื่อที่กำหนด'}); 
        return; 
    }
    
    var empIdValue = inputValue.split(':')[0].trim();
    var groupName = document.getElementById('c_groupName').value.trim();
    
    var payload = {
        action: 'save',
        oldGroup: document.getElementById('c_oldGroup').value,
        oldEmpId: document.getElementById('c_oldEmpId').value,
        group: groupName,
        empId: empIdValue
    };
    
    Swal.fire({title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); }});
    
    window.callAPI({ action: 'manageContactData', payload: payload }).then(function(res) {
        if(res.success) {
            Swal.fire({icon: 'success', title: 'สำเร็จ', text: res.message});
            var mod = bootstrap.Modal.getInstance(document.getElementById('contactModal'));
            if(mod) mod.hide();
            window.loadAdminData();
        } else {
            Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message});
        }
    });
};

window.deleteContact = function() {
    var oldGroup = document.getElementById('c_oldGroup').value;
    var oldEmpId = document.getElementById('c_oldEmpId').value;
    
    Swal.fire({ 
        title: 'ยืนยันการลบ?', 
        text: `ลบผู้ติดต่อกลุ่ม "${oldGroup}" ใช่หรือไม่?`, 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#555', 
        confirmButtonText: 'ลบทิ้ง!', 
        cancelButtonText: 'ยกเลิก' 
    }).then(function(result) {
        if (result.isConfirmed) { 
            Swal.fire({title: 'กำลังลบ...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); }}); 
            
            var payload = { action: 'delete', oldGroup: oldGroup, oldEmpId: oldEmpId };
            window.callAPI({ action: 'manageContactData', payload: payload }).then(function(res) {
                if(res.success) {
                    Swal.fire({icon: 'success', title: 'สำเร็จ', text: res.message});
                    var mod = bootstrap.Modal.getInstance(document.getElementById('contactModal'));
                    if(mod) mod.hide();
                    window.loadAdminData();
                } else {
                    Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message});
                }
            });
        }
    });
};


window.formatThaiIdForReport = function(rawId) {
    if (rawId === undefined || rawId === null) return '-';
    var s = String(rawId).trim();
    if (!s || s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '-';

    if (s.toLowerCase().indexOf('undefined') !== -1 || s.toLowerCase().indexOf('nan') !== -1) {
        var cleaned = s.replace(/undefined|null|nan/gi, '').replace(/\D/g, '');
        if (cleaned.length !== 13) return '-';
        s = cleaned;
    }

    if (/^\d+(\.\d+)?e\+\d+$/i.test(s)) {
        var num = Number(s);
        if (!isNaN(num)) {
            s = num.toLocaleString('fullwide', { useGrouping: false });
        }
    }

    var digits = s.replace(/\D/g, '');
    if (digits.length === 13) {
        return digits.charAt(0) + '-' +
               digits.substring(1, 5) + '-' +
               digits.substring(5, 10) + '-' +
               digits.substring(10, 12) + '-' +
               digits.substring(12, 13);
    }

    return s;
};

window.parseAnyYearCE = function(dateStr) {
    if (!dateStr) return null;
    var s = String(dateStr).trim();
    if (!s || s === '-') return null;
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
        var y = d.getFullYear();
        return y > 2400 ? y - 543 : y;
    }
    var parts = s.split(/[\/\-\s]/);
    for (var i = 0; i < parts.length; i++) {
        var num = parseInt(parts[i], 10);
        if (num > 2400) return num - 543;
        if (num >= 1980 && num <= 2100) return num;
    }
    return null;
};

window.isSystemDummyAccount = function(emp) {
    if (!emp) return true;
    var nameStr = String(emp.name || '').trim().toLowerCase();
    var idStr = String(emp.id || '').trim().toLowerCase();
    var userStr = String(emp.username || '').trim().toLowerCase();
    if (!nameStr || nameStr === '-' || nameStr === 'register' || nameStr === 'admin' || nameStr === 'test') {
        if (!idStr || idStr === '-' || idStr === 'register' || userStr === 'register') return true;
    }
    if (nameStr === 'register') return true;
    return false;
};

window.classifyEmpForSafety = function(emp) {
    var pos = String(emp.position || '').trim();
    var posLower = pos.toLowerCase();

    var isJoint = pos.indexOf('รถร่วม') !== -1;

    var dept = 'ฝ่ายรถบรรทุก / ขนส่ง';
    if (!isJoint) {
        var officeKeywords = ['สำนักงาน', 'ออฟฟิศ', 'office', 'บัญชี', 'การเงิน', 'ธุรการ', 'บุคคล', 'hr', 'admin', 'ผู้จัดการ', 'บริหาร', 'จัดซื้อ', 'ประสานงาน', 'เสมียน', 'แม่บ้าน'];
        var driverKeywords = ['ขับรถ', 'พนักงานขับ', 'พขร', 'ติดรถ', 'ท้ายรถ', 'ช่าง', 'ลาน', 'จัดส่ง', 'รถบรรทุก', 'หัวลาก', 'เทรลเลอร์', '6 ล้อ', '10 ล้อ', '4 ล้อ', 'เด็กรถ'];

        var matchOffice = officeKeywords.some(function(k) { return posLower.indexOf(k) !== -1; });
        var matchDriver = driverKeywords.some(function(k) { return posLower.indexOf(k) !== -1; });

        if (matchOffice && !matchDriver) {
            dept = 'ฝ่ายสำนักงาน';
        } else if (!matchDriver && (emp.role === 'Admin' || emp.role === 'Viewer') && !emp.licNum) {
            dept = 'ฝ่ายสำนักงาน';
        }
    } else {
        dept = 'รถร่วมบริการ';
    }

    var gender = 'ชาย';
    var gRaw = String(emp.gender || '').trim();
    var nameRaw = String(emp.name || '').trim();
    if (gRaw === 'หญิง' || nameRaw.indexOf('นาง') === 0 || nameRaw.indexOf('น.ส.') === 0 || nameRaw.indexOf('นางสาว') === 0) {
        gender = 'หญิง';
    } else if (gRaw === 'ชาย' || nameRaw.indexOf('นาย') === 0) {
        gender = 'ชาย';
    }

    var nationality = 'ไทย';
    var cleanIdStr = window.formatThaiIdForReport(emp.idCardNum);
    var idDigits = cleanIdStr.replace(/\D/g, '');
    var hasPassport = emp.docs && emp.docs.PASSPORT && emp.docs.PASSPORT.url;
    var textCheck = (pos + ' ' + String(emp.name || '') + ' ' + String(emp.nationality || '')).toLowerCase();

    if (
        textCheck.indexOf('ต่างด้าว') !== -1 ||
        textCheck.indexOf('พม่า') !== -1 ||
        textCheck.indexOf('เมียนมา') !== -1 ||
        textCheck.indexOf('กัมพูชา') !== -1 ||
        textCheck.indexOf('ลาว') !== -1
    ) {
        nationality = 'ต่างด้าว';
    } else if (idDigits.length === 13 && (idDigits.charAt(0) === '0' || idDigits.charAt(0) === '6' || idDigits.charAt(0) === '7')) {
        nationality = 'ต่างด้าว';
    } else if (!idDigits && hasPassport) {
        nationality = 'ต่างด้าว';
    }

    return {
        isJoint: isJoint,
        dept: dept,
        gender: gender,
        nationality: nationality
    };
};

window.createEmptySafetyStatRow = function() {
    return {
        thaiMale: 0,
        thaiFemale: 0,
        foreignMale: 0,
        foreignFemale: 0,
        totalMale: 0,
        totalFemale: 0,
        total: 0
    };
};

window.addEmpToSafetyStatRow = function(rowObj, info) {
    if (info.nationality === 'ไทย') {
        if (info.gender === 'หญิง') rowObj.thaiFemale++;
        else rowObj.thaiMale++;
    } else {
        if (info.gender === 'หญิง') rowObj.foreignFemale++;
        else rowObj.foreignMale++;
    }
    if (info.gender === 'หญิง') rowObj.totalFemale++;
    else rowObj.totalMale++;
    rowObj.total++;
};

window.openSafetyDoc2Modal = function() {
    var yearSel = document.getElementById('doc2YearFilter');
    if (yearSel) {
        var curYear = new Date().getFullYear();
        var yearsSet = new Set([curYear, curYear - 1, curYear - 2]);
        (window.allEmpData || []).forEach(function(e) {
            if (window.isSystemDummyAccount(e)) return;
            var sy = window.parseAnyYearCE(e.startDate);
            var ry = window.parseAnyYearCE(e.resignDate);
            if (sy && sy >= 2000 && sy <= curYear + 1) yearsSet.add(sy);
            if (ry && ry >= 2000 && ry <= curYear + 1) yearsSet.add(ry);
        });
        var sortedYears = Array.from(yearsSet).sort(function(a, b) { return b - a; });
        var prevVal = yearSel.value || 'all';
        yearSel.innerHTML = '<option value="all">ทุกปี (ทั้งหมด)</option>';
        sortedYears.forEach(function(y) {
            var opt = document.createElement('option');
            opt.value = String(y);
            opt.text = 'พ.ศ. ' + (y + 543) + ' (' + y + ')';
            if (String(y) === String(prevVal)) opt.selected = true;
            yearSel.appendChild(opt);
        });
        if (prevVal === 'all') yearSel.value = 'all';
    }
    window.renderSafetyDoc2();
    window.showModalSafe('safetyDoc2Modal');
};

window.renderSafetyDoc2 = function() {
    var container = document.getElementById('safetyDoc2PrintArea');
    if (!container) return;

    var companyNameEl = document.getElementById('doc2CompanyName');
    var companyName = companyNameEl ? companyNameEl.value.trim() : 'ห้างหุ้นส่วนจำกัด';
    var statusFilterEl = document.getElementById('doc2StatusFilter');
    var statusFilter = statusFilterEl ? statusFilterEl.value : 'Active';
    var yearFilterEl = document.getElementById('doc2YearFilter');
    var yearFilter = yearFilterEl ? yearFilterEl.value : 'all';
    var targetYear = yearFilter !== 'all' ? parseInt(yearFilter, 10) : null;

    var rawList = window.allEmpData || [];
    var filtered = rawList.filter(function(e) {
        if (window.isSystemDummyAccount(e)) return false;

        if (!targetYear) {
            if (statusFilter === 'Active') return e.status === 'Active';
            return true;
        } else {
            var startY = window.parseAnyYearCE(e.startDate);
            var resignY = window.parseAnyYearCE(e.resignDate);

            if (startY && startY > targetYear) return false;

            if (statusFilter === 'Active') {
                if (e.status === 'Active') return true;
                if (e.status === 'Resigned' && resignY && resignY > targetYear) return true;
                return false;
            } else {
                if (e.status === 'Resigned' && resignY && resignY < targetYear) return false;
                return true;
            }
        }
    });

    filtered.sort(function(a, b) {
        return String(a.id || '').localeCompare(String(b.id || ''), 'th', { numeric: true });
    });

    var statTruck = window.createEmptySafetyStatRow();
    var statOffice = window.createEmptySafetyStatRow();
    var statCompSub = window.createEmptySafetyStatRow();
    var statJoint = window.createEmptySafetyStatRow();
    var statGrand = window.createEmptySafetyStatRow();

    var compEmps = [];
    var jointEmps = [];

    filtered.forEach(function(emp) {
        var info = window.classifyEmpForSafety(emp);
        var enriched = { emp: emp, info: info };

        if (info.isJoint) {
            jointEmps.push(enriched);
            window.addEmpToSafetyStatRow(statJoint, info);
        } else {
            compEmps.push(enriched);
            if (info.dept === 'ฝ่ายสำนักงาน') {
                window.addEmpToSafetyStatRow(statOffice, info);
            } else {
                window.addEmpToSafetyStatRow(statTruck, info);
            }
            window.addEmpToSafetyStatRow(statCompSub, info);
        }
        window.addEmpToSafetyStatRow(statGrand, info);
    });

    var todayThai = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    var yearLabel = targetYear ? ('ประจำปี พ.ศ. ' + (targetYear + 543) + ' (' + targetYear + ')') : 'ทุกปี (ทั้งหมด)';
    var statusLabel = statusFilter === 'Active' ? 'เฉพาะผู้ปฏิบัติงาน (Active)' : 'รวมพนักงานทั้งหมด (Active / พักงาน / ลาออก)';

    var buildSummaryTr = function(label, r, bgStyle, isBold) {
        var fw = isBold ? 'font-weight:bold;' : '';
        return `<tr style="${bgStyle}${fw}">
            <td style="border:1px solid #333; padding:4px 8px; text-align:left;">${label}</td>
            <td style="border:1px solid #333; padding:4px 6px; text-align:center;">${r.thaiMale}</td>
            <td style="border:1px solid #333; padding:4px 6px; text-align:center;">${r.thaiFemale}</td>
            <td style="border:1px solid #333; padding:4px 6px; text-align:center;">${r.foreignMale}</td>
            <td style="border:1px solid #333; padding:4px 6px; text-align:center;">${r.foreignFemale}</td>
            <td style="border:1px solid #333; padding:4px 6px; text-align:center;">${r.totalMale}</td>
            <td style="border:1px solid #333; padding:4px 6px; text-align:center;">${r.totalFemale}</td>
            <td style="border:1px solid #333; padding:4px 6px; text-align:center; font-weight:bold;">${r.total}</td>
        </tr>`;
    };

    var buildEmpRows = function(arr) {
        if (arr.length === 0) {
            return `<tr><td colspan="9" style="border:1px solid #333; padding:10px; text-align:center; color:#666;">- ไม่มีรายชื่อในหมวดนี้ -</td></tr>`;
        }
        var rowsHtml = '';
        arr.forEach(function(item, idx) {
            var e = item.emp;
            var inf = item.info;
            var resignYearCheck = window.parseAnyYearCE(e.resignDate);
            var statusTh = 'ทำงานปกติ';
            if (e.status === 'Resigned') {
                if (targetYear && resignYearCheck && resignYearCheck > targetYear) {
                    statusTh = 'ทำงานปกติ (ออกปี ' + resignYearCheck + ')';
                } else {
                    statusTh = 'ลาออก (' + window.formatDate(e.resignDate) + ')';
                }
            } else if (e.status === 'Suspended') {
                statusTh = 'พักงาน';
            }

            var startText = window.formatDate(e.startDate);

            rowsHtml += `<tr>
                <td style="border:1px solid #333; padding:4px 3px; text-align:center; white-space:nowrap;">${idx + 1}</td>
                <td class="xl-text" style="border:1px solid #333; padding:4px 4px; text-align:center; white-space:nowrap; mso-number-format:'\\@';">${e.id || '-'}</td>
                <td style="border:1px solid #333; padding:4px 6px; text-align:left; word-break:break-word;">${e.name || '-'}</td>
                <td style="border:1px solid #333; padding:4px 3px; text-align:center; white-space:nowrap;">${inf.gender}</td>
                <td style="border:1px solid #333; padding:4px 3px; text-align:center; white-space:nowrap;">${inf.nationality}</td>
                <td style="border:1px solid #333; padding:4px 6px; text-align:left; word-break:break-word;">${e.position || '-'}</td>
                <td style="border:1px solid #333; padding:4px 4px; text-align:center; white-space:nowrap;">${inf.dept}</td>
                <td class="xl-text" style="border:1px solid #333; padding:4px 4px; text-align:center; white-space:nowrap; mso-number-format:'\\@';">${startText}</td>
                <td style="border:1px solid #333; padding:4px 4px; text-align:center; word-break:break-word;">${statusTh}</td>
            </tr>`;
        });
        return rowsHtml;
    };

    var html = `
    <div style="font-family: 'Sarabun', sans-serif; color: #000; font-size: 11.5px; line-height: 1.35;">
        <div style="text-align:center; margin-bottom: 10px;">
            <div style="font-size: 16px; font-weight: bold;">ทะเบียนลูกจ้าง และยอดสรุปจำนวนลูกจ้าง (เอกสารตรวจความปลอดภัยฯ ข้อ 2)</div>
            <div style="font-size: 13.5px; font-weight: bold; margin-top: 2px;">สถานประกอบกิจการ: ${companyName}</div>
            <div style="font-size: 11px; color: #444; margin-top: 2px;">ข้อมูล ณ วันที่ ${todayThai} | ช่วงเวลา: ${yearLabel} | เงื่อนไข: ${statusLabel}</div>
        </div>

        <div style="font-weight: bold; font-size: 12.5px; margin-bottom: 5px;">ส่วนที่ 1 : ตารางสรุปจำนวนลูกจ้าง (แยกฝ่ายรถ / สำนักงาน, ไทย / ต่างด้าว, ชาย / หญิง และแยกรถร่วม)</div>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px;">
            <thead>
                <tr style="background-color: #e9ecef;">
                    <th rowspan="2" style="border:1px solid #333; padding:5px 8px; text-align:center;">ประเภท / แผนก / ฝ่าย</th>
                    <th colspan="2" style="border:1px solid #333; padding:4px; text-align:center;">สัญชาติไทย (คน)</th>
                    <th colspan="2" style="border:1px solid #333; padding:4px; text-align:center;">ต่างด้าว (คน)</th>
                    <th colspan="2" style="border:1px solid #333; padding:4px; text-align:center;">รวมแยกเพศ (คน)</th>
                    <th rowspan="2" style="border:1px solid #333; padding:5px; text-align:center;">รวมทั้งสิ้น<br>(คน)</th>
                </tr>
                <tr style="background-color: #f8f9fa;">
                    <th style="border:1px solid #333; padding:4px; text-align:center;">ชาย</th>
                    <th style="border:1px solid #333; padding:4px; text-align:center;">หญิง</th>
                    <th style="border:1px solid #333; padding:4px; text-align:center;">ชาย</th>
                    <th style="border:1px solid #333; padding:4px; text-align:center;">หญิง</th>
                    <th style="border:1px solid #333; padding:4px; text-align:center;">รวมชาย</th>
                    <th style="border:1px solid #333; padding:4px; text-align:center;">รวมหญิง</th>
                </tr>
            </thead>
            <tbody>
                ${buildSummaryTr('1. ลูกจ้าง หจก. - ฝ่ายรถบรรทุก / ขนส่ง', statTruck, '', false)}
                ${buildSummaryTr('2. ลูกจ้าง หจก. - ฝ่ายสำนักงาน (Office)', statOffice, '', false)}
                ${buildSummaryTr('รวมลูกจ้างประจำของ หจก. ทั้งสิ้น (1 + 2)', statCompSub, 'background-color:#d1e7dd;', true)}
                ${buildSummaryTr('3. พนักงานรถร่วมบริการ (แยกบัญชีรถร่วม)', statJoint, 'background-color:#fff3cd;', false)}
                ${buildSummaryTr('รวมผู้ปฏิบัติงานในระบบทั้งหมด (หจก. + รถร่วม)', statGrand, 'background-color:#cfe2ff;', true)}
            </tbody>
        </table>

        <div style="font-weight: bold; font-size: 12.5px; margin-bottom: 5px;">ส่วนที่ 2.1 : ทะเบียนรายชื่อลูกจ้างของ หจก. (จำนวน ${compEmps.length} คน)</div>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px; table-layout: fixed;">
            <thead>
                <tr style="background-color: #e9ecef;">
                    <th style="border:1px solid #333; padding:5px 3px; text-align:center; width:4.5%;">ลำดับ</th>
                    <th style="border:1px solid #333; padding:5px 4px; text-align:center; width:8.5%;">รหัส</th>
                    <th style="border:1px solid #333; padding:5px 6px; text-align:center; width:22%;">ชื่อ - นามสกุล</th>
                    <th style="border:1px solid #333; padding:5px 3px; text-align:center; width:5%;">เพศ</th>
                    <th style="border:1px solid #333; padding:5px 3px; text-align:center; width:6%;">สัญชาติ</th>
                    <th style="border:1px solid #333; padding:5px 6px; text-align:center; width:22%;">ตำแหน่งงาน</th>
                    <th style="border:1px solid #333; padding:5px 4px; text-align:center; width:13%;">ฝ่าย</th>
                    <th style="border:1px solid #333; padding:5px 4px; text-align:center; width:9.5%;">วันเริ่มงาน</th>
                    <th style="border:1px solid #333; padding:5px 4px; text-align:center; width:9.5%;">สถานะ</th>
                </tr>
            </thead>
            <tbody>
                ${buildEmpRows(compEmps)}
            </tbody>
        </table>

        <div style="font-weight: bold; font-size: 12.5px; margin-bottom: 5px;">ส่วนที่ 2.2 : ทะเบียนรายชื่อพนักงานรถร่วมบริการ (แยกเฉพาะรถร่วม จำนวน ${jointEmps.length} คน)</div>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; table-layout: fixed;">
            <thead>
                <tr style="background-color: #fff3cd;">
                    <th style="border:1px solid #333; padding:5px 3px; text-align:center; width:4.5%;">ลำดับ</th>
                    <th style="border:1px solid #333; padding:5px 4px; text-align:center; width:8.5%;">รหัส</th>
                    <th style="border:1px solid #333; padding:5px 6px; text-align:center; width:22%;">ชื่อ - นามสกุล</th>
                    <th style="border:1px solid #333; padding:5px 3px; text-align:center; width:5%;">เพศ</th>
                    <th style="border:1px solid #333; padding:5px 3px; text-align:center; width:6%;">สัญชาติ</th>
                    <th style="border:1px solid #333; padding:5px 6px; text-align:center; width:22%;">ตำแหน่งงาน</th>
                    <th style="border:1px solid #333; padding:5px 4px; text-align:center; width:13%;">ประเภท</th>
                    <th style="border:1px solid #333; padding:5px 4px; text-align:center; width:9.5%;">วันเริ่มสัญญา</th>
                    <th style="border:1px solid #333; padding:5px 4px; text-align:center; width:9.5%;">สถานะ</th>
                </tr>
            </thead>
            <tbody>
                ${buildEmpRows(jointEmps)}
            </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; margin-top: 24px; padding: 0 30px; font-size: 11.5px;">
            <div style="text-align:center;">
                <div>ลงชื่อ ....................................................... ผู้จัดทำข้อมูล</div>
                <div style="margin-top:4px;">( ....................................................... )</div>
                <div style="margin-top:4px;">วันที่ ......... / ......... / .............</div>
            </div>
            <div style="text-align:center;">
                <div>ลงชื่อ ....................................................... นายจ้าง / ผู้มีอำนาจลงนาม</div>
                <div style="margin-top:4px;">( ....................................................... )</div>
                <div style="margin-top:4px;">วันที่ ......... / ......... / .............</div>
            </div>
        </div>
    </div>`;

    container.innerHTML = html;
};

window.parseAccidentYearCE = function(dateStr) {
    return window.parseAnyYearCE(dateStr);
};

window.openSafetyDoc6Modal = function() {
    var yearSel = document.getElementById('doc6YearFilter');
    if (yearSel) {
        var curYear = new Date().getFullYear();
        var yearsSet = new Set([curYear, curYear - 1, curYear - 2]);
        (window.allAccidentData || []).forEach(function(a) {
            var y = window.parseAccidentYearCE(a.accDate);
            if (y) yearsSet.add(y);
        });
        var sortedYears = Array.from(yearsSet).sort(function(a, b) { return b - a; });
        var prevVal = yearSel.value;
        yearSel.innerHTML = '';
        sortedYears.forEach(function(y) {
            var opt = document.createElement('option');
            opt.value = String(y);
            opt.text = 'พ.ศ. ' + (y + 543) + ' (' + y + ')';
            if (prevVal ? String(y) === prevVal : y === curYear) opt.selected = true;
            yearSel.appendChild(opt);
        });
    }
    window.renderSafetyDoc6();
    window.showModalSafe('safetyDoc6Modal');
};

window.classifyAccidentInjuryLevel = function(acc) {
    var text = (String(acc.damage || '') + ' ' + String(acc.detail || '') + ' ' + String(acc.fixText || '')).toLowerCase();

    var cleanText = text.replace(/ไม่มีผู้บาดเจ็บ|ไม่มีคนเจ็บ|ไม่บาดเจ็บ|ไม่มีผู้เสียชีวิต|ล้อถลอก|สีถลอก|รถถลอก|กันชนถลอก|ตัวถังถลอก|ยางถลอก|ขอบถลอก/g, '');

    if (cleanText.indexOf('เสียชีวิต') !== -1 || cleanText.indexOf('คนตาย') !== -1 || cleanText.indexOf('ถึงแก่ความตาย') !== -1) {
        return 'death';
    }
    if (cleanText.indexOf('พิการ') !== -1 || cleanText.indexOf('ทุพพลภาพ') !== -1 || cleanText.indexOf('สูญเสียอวัยวะ') !== -1) {
        return 'disability';
    }
    if (cleanText.indexOf('หยุดงานเกิน 3 วัน') !== -1 || cleanText.indexOf('นอนโรงพยาบาล') !== -1 || cleanText.indexOf('แอดมิท') !== -1 || cleanText.indexOf('บาดเจ็บสาหัส') !== -1) {
        return 'over3';
    }
    if (cleanText.indexOf('หยุดงาน') !== -1 || cleanText.indexOf('ลาป่วย') !== -1) {
        return 'upto3';
    }
    if (cleanText.indexOf('บาดเจ็บ') !== -1 || cleanText.indexOf('ปฐมพยาบาล') !== -1 || cleanText.indexOf('ทำแผล') !== -1 || cleanText.indexOf('ฟกช้ำ') !== -1 || cleanText.indexOf('แผลถลอก') !== -1 || cleanText.indexOf('คนเจ็บ') !== -1) {
        return 'noLostTime';
    }
    return 'propertyOnly';
};

window.renderSafetyDoc6 = function() {
    var container = document.getElementById('safetyDoc6PrintArea');
    if (!container) return;

    var companyNameEl = document.getElementById('doc6CompanyName');
    var companyName = companyNameEl ? companyNameEl.value.trim() : 'ห้างหุ้นส่วนจำกัด';
    var yearSel = document.getElementById('doc6YearFilter');
    var selectedYear = yearSel && yearSel.value ? parseInt(yearSel.value, 10) : new Date().getFullYear();
    var thaiYear = selectedYear + 543;
    var excludeJointEl = document.getElementById('doc6ExcludeJointCheck');
    var excludeJoint = excludeJointEl ? excludeJointEl.checked : false;

    var empMap = {};
    (window.allEmpData || []).forEach(function(e) {
        empMap[String(e.id).trim()] = e;
    });

    var activeCompanyEmps = (window.allEmpData || []).filter(function(e) {
        if (window.isSystemDummyAccount(e)) return false;
        if (e.status !== 'Active') return false;
        if (excludeJoint && String(e.position || '').indexOf('รถร่วม') !== -1) return false;
        return true;
    }).length;

    var yearAccidents = (window.allAccidentData || []).filter(function(a) {
        var y = window.parseAccidentYearCE(a.accDate);
        if (y !== selectedYear) return false;
        if (excludeJoint) {
            var empObj = empMap[String(a.empId || '').trim()];
            if (empObj && String(empObj.position || '').indexOf('รถร่วม') !== -1) {
                return false;
            }
        }
        return true;
    });

    var counts = {
        death: 0,
        disability: 0,
        over3: 0,
        upto3: 0,
        noLostTime: 0,
        propertyOnly: 0
    };

    yearAccidents.forEach(function(acc) {
        var lvl = window.classifyAccidentInjuryLevel(acc);
        counts[lvl]++;
    });

    var totalInjuryCases = counts.death + counts.disability + counts.over3 + counts.upto3 + counts.noLostTime;
    var totalAllIncidents = yearAccidents.length;
    var todayThai = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    var scopeNote = excludeJoint ? 'เฉพาะลูกจ้างประจำของ หจก. (ไม่รวมรถร่วมบริการ)' : 'รวมผู้ปฏิบัติงานทั้งหมดในระบบ';

    var detailTableHtml = '';
    if (yearAccidents.length === 0) {
        detailTableHtml = `
        <div style="border: 2px solid #198754; background-color: #f8fff9; padding: 14px; text-align: center; margin-bottom: 20px; border-radius: 6px;">
            <div style="font-size: 13.5px; font-weight: bold; color: #0f5132;">สรุปผลการดำเนินงานด้านความปลอดภัย ประจำปี พ.ศ. ${thaiYear}</div>
            <div style="font-size: 12.5px; margin-top: 5px;">สถานประกอบกิจการ <b>ไม่มีลูกจ้างประสบอันตรายหรือเกิดอุบัติเหตุจากการทำงาน (สถิติการประสบอันตราย = 0 ราย)</b></div>
        </div>`;
    } else {
        var detailRows = '';
        yearAccidents.forEach(function(a, idx) {
            var empObj = empMap[String(a.empId || '').trim()];
            var isJointTag = (empObj && String(empObj.position || '').indexOf('รถร่วม') !== -1) ? ' (รถร่วม)' : '';
            var lvl = window.classifyAccidentInjuryLevel(a);
            var lvlLabel = 'ทรัพย์สินเสียหาย (เจ็บ 0 ราย)';
            if (lvl === 'death') lvlLabel = 'เสียชีวิต';
            else if (lvl === 'disability') lvlLabel = 'ทุพพลภาพ/สูญเสียอวัยวะ';
            else if (lvl === 'over3') lvlLabel = 'บาดเจ็บหยุดงานเกิน 3 วัน';
            else if (lvl === 'upto3') lvlLabel = 'บาดเจ็บหยุดงานไม่เกิน 3 วัน';
            else if (lvl === 'noLostTime') lvlLabel = 'บาดเจ็บเล็กน้อย (ไม่หยุดงาน)';

            var resolvedCause = window.resolveAccidentCause(a);
            var resolvedBy = window.resolveAccidentCausedBy(a);
            var fullCauseDisplay = resolvedCause;
            if (resolvedBy && resolvedBy !== '-' && resolvedBy !== 'อื่นๆ' && fullCauseDisplay.indexOf(resolvedBy) === -1) {
                fullCauseDisplay = resolvedCause + ' [' + resolvedBy + ']';
            }

            detailRows += `<tr>
                <td style="border:1px solid #333; padding:4px 3px; text-align:center;">${idx + 1}</td>
                <td class="xl-text" style="border:1px solid #333; padding:4px 4px; text-align:center; white-space:nowrap; mso-number-format:'\\@';">${a.docNo || '-'}</td>
                <td class="xl-text" style="border:1px solid #333; padding:4px 4px; text-align:center; white-space:nowrap; mso-number-format:'\\@';">${a.accDate || '-'} ${a.accTime || ''}</td>
                <td style="border:1px solid #333; padding:4px 5px; text-align:left; word-break:break-word;">${a.empName || '-'}${isJointTag}</td>
                <td style="border:1px solid #333; padding:4px 4px; text-align:center; word-break:break-word;">${a.vehType || '-'} (${a.truckPlate || '-'})</td>
                <td style="border:1px solid #333; padding:4px 5px; text-align:left; word-break:break-word;">${a.location || '-'}</td>
                <td style="border:1px solid #333; padding:4px 5px; text-align:left; word-break:break-word;">${fullCauseDisplay}</td>
                <td style="border:1px solid #333; padding:4px 5px; text-align:left; word-break:break-word;">${a.damage || '-'}</td>
                <td style="border:1px solid #333; padding:4px 4px; text-align:center; word-break:break-word;">${lvlLabel}</td>
            </tr>`;
        });

        detailTableHtml = `
        <div style="font-weight: bold; font-size: 12.5px; margin-bottom: 5px;">ส่วนที่ 2 : ทะเบียนบันทึกเหตุการณ์อุบัติเหตุทางถนน/ในการทำงาน ประจำปี พ.ศ. ${thaiYear} (จำนวน ${totalAllIncidents} ครั้ง)</div>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10.5px; table-layout: fixed;">
            <thead>
                <tr style="background-color: #e9ecef;">
                    <th style="border:1px solid #333; padding:4px 3px; text-align:center; width:4%;">ลำดับ</th>
                    <th style="border:1px solid #333; padding:4px 4px; text-align:center; width:9%;">เลขที่เอกสาร</th>
                    <th style="border:1px solid #333; padding:4px 4px; text-align:center; width:11%;">วัน-เวลาเกิดเหตุ</th>
                    <th style="border:1px solid #333; padding:4px 5px; text-align:center; width:13%;">ชื่อผู้ประสบเหตุ</th>
                    <th style="border:1px solid #333; padding:4px 4px; text-align:center; width:12%;">รถ / ทะเบียน</th>
                    <th style="border:1px solid #333; padding:4px 5px; text-align:center; width:13%;">สถานที่เกิดเหตุ</th>
                    <th style="border:1px solid #333; padding:4px 5px; text-align:center; width:14%;">สาเหตุ (รายละเอียด)</th>
                    <th style="border:1px solid #333; padding:4px 5px; text-align:center; width:13%;">ความเสียหาย/อาการ</th>
                    <th style="border:1px solid #333; padding:4px 4px; text-align:center; width:11%;">ระดับความรุนแรง</th>
                </tr>
            </thead>
            <tbody>
                ${detailRows}
            </tbody>
        </table>`;
    }

    var html = `
    <div style="font-family: 'Sarabun', sans-serif; color: #000; font-size: 11.5px; line-height: 1.4;">
        <div style="text-align:center; margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: bold;">แบบสรุปสถิติการประสบอันตรายจากการทำงาน ประจำปี พ.ศ. ${thaiYear} (เอกสารข้อ 6)</div>
            <div style="font-size: 13.5px; font-weight: bold; margin-top: 2px;">สถานประกอบกิจการ: ${companyName}</div>
            <div style="font-size: 11px; color: #444; margin-top: 2px;">ข้อมูล ณ วันที่ ${todayThai} | ขอบเขตข้อมูล: ${scopeNote} | จำนวนผู้ปฏิบัติงานปัจจุบัน: ${activeCompanyEmps} คน</div>
        </div>

        <div style="font-weight: bold; font-size: 12.5px; margin-bottom: 5px;">ส่วนที่ 1 : ตารางสรุปสถิติการประสบอันตรายหรือเจ็บป่วยเนื่องจากการทำงาน (1 มกราคม - 31 ธันวาคม พ.ศ. ${thaiYear})</div>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px;">
            <thead>
                <tr style="background-color: #e9ecef;">
                    <th style="border:1px solid #333; padding:5px; text-align:center; width:45px;">ลำดับ</th>
                    <th style="border:1px solid #333; padding:5px 10px; text-align:left;">ระดับความรุนแรงของการประสบอันตรายจากการทำงาน</th>
                    <th style="border:1px solid #333; padding:5px; text-align:center; width:120px;">จำนวนลูกจ้าง (ราย)</th>
                    <th style="border:1px solid #333; padding:5px; text-align:center; width:165px;">หมายเหตุ</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">1</td>
                    <td style="border:1px solid #333; padding:5px 10px;">กรณีเสียชีวิตเนื่องจากการทำงาน</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold;">${counts.death}</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">${counts.death === 0 ? 'ไม่มีผู้ประสบเหตุ' : '-'}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">2</td>
                    <td style="border:1px solid #333; padding:5px 10px;">กรณีทุพพลภาพ หรือสูญเสียอวัยวะบางส่วน</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold;">${counts.disability}</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">${counts.disability === 0 ? 'ไม่มีผู้ประสบเหตุ' : '-'}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">3</td>
                    <td style="border:1px solid #333; padding:5px 10px;">กรณีบาดเจ็บหรือเจ็บป่วยจนต้องหยุดงานเกิน 3 วันทำงานติดต่อกัน</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold;">${counts.over3}</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">${counts.over3 === 0 ? 'ไม่มีผู้ประสบเหตุ' : '-'}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">4</td>
                    <td style="border:1px solid #333; padding:5px 10px;">กรณีบาดเจ็บหรือเจ็บป่วยจนต้องหยุดงานไม่เกิน 3 วันทำงาน</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold;">${counts.upto3}</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">${counts.upto3 === 0 ? 'ไม่มีผู้ประสบเหตุ' : '-'}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">5</td>
                    <td style="border:1px solid #333; padding:5px 10px;">กรณีบาดเจ็บเล็กน้อย (ปฐมพยาบาล ไม่มีการหยุดงาน)</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold;">${counts.noLostTime}</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">${counts.noLostTime === 0 ? 'ไม่มีผู้ประสบเหตุ' : '-'}</td>
                </tr>
                <tr style="background-color: #d1e7dd; font-weight: bold;">
                    <td colspan="2" style="border:1px solid #333; padding:6px 10px; text-align:right;">รวมจำนวนลูกจ้างที่ประสบอันตรายจากการทำงานทั้งสิ้น (ข้อ 1 - 5)</td>
                    <td style="border:1px solid #333; padding:6px; text-align:center; font-size:13px;">${totalInjuryCases} ราย</td>
                    <td style="border:1px solid #333; padding:6px; text-align:center;">${totalInjuryCases === 0 ? 'ปลอดภัย 100% (0 ราย)' : 'มีประวัติตามรายละเอียดแนบ'}</td>
                </tr>
                <tr style="background-color: #fff3cd;">
                    <td colspan="2" style="border:1px solid #333; padding:5px 10px; text-align:right;">สถิติอุบัติเหตุทางรถยนต์/ทรัพย์สินเสียหาย (ไม่มีลูกจ้างบาดเจ็บ)</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold;">${counts.propertyOnly} ครั้ง</td>
                    <td style="border:1px solid #333; padding:5px; text-align:center;">บันทึกจากระบบแจ้งอุบัติเหตุ</td>
                </tr>
            </tbody>
        </table>

        ${detailTableHtml}

        <div style="display:flex; justify-content:space-between; margin-top: 26px; padding: 0 30px; font-size: 11.5px;">
            <div style="text-align:center;">
                <div>ลงชื่อ ....................................................... จป.บริหาร / ผู้จัดทำ</div>
                <div style="margin-top:4px;">( ....................................................... )</div>
                <div style="margin-top:4px;">วันที่ ......... / ......... / .............</div>
            </div>
            <div style="text-align:center;">
                <div>ลงชื่อ ....................................................... นายจ้าง / ผู้มีอำนาจลงนาม</div>
                <div style="margin-top:4px;">( ....................................................... )</div>
                <div style="margin-top:4px;">วันที่ ......... / ......... / .............</div>
            </div>
        </div>
    </div>`;

    container.innerHTML = html;
};

window.printSafetyDoc = function(elementId, docTitle) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
        Swal.fire({ icon: 'warning', title: 'เปิดหน้าต่างพิมพ์ไม่ได้', text: 'กรุณาอนุญาต Pop-up ของเบราว์เซอร์ก่อนพิมพ์เอกสาร', background: '#1a1a1a', color: '#fff' });
        return;
    }
    printWindow.document.write(`<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${docTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; color: #000; background: #fff; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
        </style>
    </head>
    <body>
        ${el.innerHTML}
        <script>
            window.onload = function() {
                setTimeout(function() { window.print(); }, 400);
            };
        <\/script>
    </body>
    </html>`);
    printWindow.document.close();
};

window.exportSafetyDocExcel = function(elementId, fileNamePrefix) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="UTF-8">
        <style>
            .xl-text { mso-number-format:"\\@"; }
            td, th { font-family: 'Sarabun', Tahoma, sans-serif; }
        </style>
    </head>
    <body>${el.innerHTML}</body></html>`;

    var blob = new Blob(['\ufeff', excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileNamePrefix + '_' + new Date().toISOString().slice(0, 10) + '.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

if (typeof window.numberWithCommas !== 'function') {
    window.numberWithCommas = function(x) {
        if (x === undefined || x === null || x === '') return "0.00";
        var num = parseFloat(x);
        if (isNaN(num)) return "0.00";
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
}
