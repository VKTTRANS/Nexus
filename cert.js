window.allCertRequests = [];
window.myCertRequests = [];

window.u_openCertModal = function() {
    var d = window.currentUserData;
    if (!d || !d.id) {
        Swal.fire({ icon: 'error', title: 'ไม่พบข้อมูลพนักงาน', background: '#1e1e1e', color: '#fff' });
        return;
    }

    if (d.status && d.status !== 'Active') {
        Swal.fire({
            icon: 'warning',
            title: 'ไม่สามารถขอเอกสารได้',
            text: 'สงวนสิทธิ์เฉพาะพนักงานที่มีสถานะทำงานปกติ (Active) เท่านั้น',
            background: '#1e1e1e', color: '#fff'
        });
        return;
    }

    var form = document.getElementById('certRequestForm');
    if (form) form.reset();

    document.getElementById('u_cert_fullname').value = d.name || '';
    document.getElementById('u_cert_position').value = d.position || 'พนักงาน';
    
    var otherInput = document.getElementById('u_cert_purpose_other');
    if (otherInput) {
        otherInput.classList.add('d-none');
        otherInput.required = false;
        otherInput.value = '';
    }

    var modalEl = document.getElementById('certRequestModal');
    if (modalEl) {
        var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }

    window.u_loadMyCertRequests();
};

window.u_toggleCertPurposeOther = function() {
    var sel = document.getElementById('u_cert_purpose_select');
    var other = document.getElementById('u_cert_purpose_other');
    if (!sel || !other) return;

    if (sel.value === 'อื่นๆ') {
        other.classList.remove('d-none');
        other.required = true;
        other.focus();
    } else {
        other.classList.add('d-none');
        other.required = false;
        other.value = '';
    }
};

window.u_submitCertRequest = async function(e) {
    e.preventDefault();
    var d = window.currentUserData;
    if (!d) return;

    var selVal = document.getElementById('u_cert_purpose_select').value;
    var otherVal = document.getElementById('u_cert_purpose_other').value.trim();
    var finalPurpose = (selVal === 'อื่นๆ') ? otherVal : selVal;

    if (!finalPurpose) {
        Swal.fire({ icon: 'warning', title: 'แจ้งเตือน', text: 'กรุณาระบุวัตถุประสงค์ในการขอเอกสาร', background: '#1e1e1e', color: '#fff' });
        return;
    }

    var btn = document.getElementById('btnUserSubmitCert');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังส่งคำขอ...';
    btn.disabled = true;

    var startDateFormatted = window.u_formatDate ? window.u_formatDate(d.startDate) : d.startDate;

    try {
        const res = await window.callAPI({
            action: 'requestWorkCert',
            payload: {
                empId: d.id,
                empName: d.name,
                position: d.position || 'พนักงาน',
                startDate: startDateFormatted,
                purpose: finalPurpose
            }
        });

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (res && res.success) {
            Swal.fire({
                icon: 'success',
                title: 'ส่งคำขอสำเร็จ!',
                text: 'คำขอของคุณถูกส่งไปยังฝ่ายบุคคล (Admin) เพื่อพิจารณาอนุมัติแล้ว',
                background: '#1e1e1e', color: '#fff'
            });
            document.getElementById('certRequestForm').reset();
            document.getElementById('u_cert_fullname').value = d.name || '';
            document.getElementById('u_cert_position').value = d.position || 'พนักงาน';
            document.getElementById('u_cert_purpose_other').classList.add('d-none');
            window.u_loadMyCertRequests();
        } else {
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message || 'ไม่สามารถส่งคำขอได้', background: '#1e1e1e', color: '#fff' });
        }
    } catch (err) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message, background: '#1e1e1e', color: '#fff' });
    }
};

window.u_loadMyCertRequests = function() {
    var container = document.getElementById('u_certHistoryList');
    if (!container || !window.currentUserData) return;

    container.innerHTML = '<div class="text-center text-muted py-4 small"><div class="spinner-border spinner-border-sm text-success mb-2"></div><br>กำลังโหลดข้อมูล...</div>';

    window.callAPI({
        action: 'getCertRequests',
        role: 'User',
        empId: window.currentUserData.id
    }).then(function(list) {
        window.myCertRequests = list || [];
        if (window.myCertRequests.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-4 small"><i class="bi bi-file-earmark-text fs-2 d-block mb-2 opacity-50"></i>ยังไม่มีประวัติการขอหนังสือรับรอง</div>';
            return;
        }

        var html = '';
        window.myCertRequests.forEach(function(item) {
            var statusBadge = '';
            var actionHtml = '';
            var expInfo = '';

            var isExpired = false;
            if (item.expireDateRaw) {
                var expD = new Date(item.expireDateRaw);
                var nowD = new Date();
                nowD.setHours(0,0,0,0);
                if (!isNaN(expD.getTime()) && nowD > expD) {
                    isExpired = true;
                }
            }

            if (item.status === 'Pending' || item.status === 'รออนุมัติ') {
                statusBadge = '<span class="badge bg-warning text-dark rounded-pill px-3 py-1"><i class="bi bi-hourglass-split me-1"></i>รออนุมัติ</span>';
            } else if (item.status === 'Approved' || item.status === 'อนุมัติแล้ว') {
                if (isExpired) {
                    statusBadge = '<span class="badge bg-secondary text-light rounded-pill px-3 py-1">หมดอายุแล้ว (เกิน 30 วัน)</span>';
                    actionHtml = '<button class="btn btn-sm btn-secondary rounded-pill px-3" disabled><i class="bi bi-file-earmark-x me-1"></i>เอกสารหมดอายุ</button>';
                } else {
                    statusBadge = '<span class="badge bg-success text-dark rounded-pill px-3 py-1"><i class="bi bi-check-circle-fill me-1"></i>อนุมัติแล้ว</span>';
                    if (item.pdfUrl && item.pdfUrl !== '-') {
                        var fileIdMatch = String(item.pdfUrl).match(/[-\w]{25,}/);
                        var directDlUrl = fileIdMatch ? ("https://drive.google.com/uc?export=download&id=" + fileIdMatch[0]) : item.pdfUrl;
                        
                        actionHtml = `
                        <div class="d-flex gap-2 justify-content-md-end justify-content-center">
                            <a href="${item.pdfUrl}" target="_blank" class="btn btn-sm btn-outline-info rounded-pill px-3"><i class="bi bi-eye me-1"></i>เปิดดู</a>
                            <a href="${directDlUrl}" target="_blank" class="btn btn-sm btn-success text-dark fw-bold rounded-pill px-3 shadow-sm"><i class="bi bi-download me-1"></i>ดาวน์โหลด PDF</a>
                        </div>`;
                    }
                }
                if (item.issueDate && item.expireDate) {
                    expInfo = `<div class="small text-info mt-1"><i class="bi bi-calendar-check me-1"></i>วันออกเอกสาร: ${item.issueDate} | <span class="text-warning">ใช้ได้ถึง: ${item.expireDate}</span></div>`;
                }
            } else if (item.status === 'Rejected' || item.status === 'ไม่อนุมัติ') {
                statusBadge = '<span class="badge bg-danger text-white rounded-pill px-3 py-1"><i class="bi bi-x-circle-fill me-1"></i>ไม่อนุมัติ</span>';
                if (item.rejectReason) {
                    expInfo = `<div class="small text-danger mt-1">เหตุผล: ${item.rejectReason}</div>`;
                }
            }

            html += `
            <div class="history-item border-start border-4 border-success mb-2 p-3 rounded" style="background: rgba(255,255,255,0.03);">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 pb-2 border-bottom border-secondary border-opacity-25">
                    <div>
                        <span class="font-monospace text-success fw-bold me-2">${item.reqId}</span>
                        <span class="small text-muted">วันที่ขอ: ${item.reqDate}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                    <div>
                        <div class="text-light small"><b>วัตถุประสงค์:</b> ${item.purpose || '-'}</div>
                        ${expInfo}
                    </div>
                    <div class="text-md-end">${actionHtml}</div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    }).catch(function() {
        container.innerHTML = '<div class="text-center text-danger py-3 small">ไม่สามารถโหลดประวัติได้</div>';
    });
};

window.loadAdminCertData = function() {
    var tbody = document.getElementById('adminCertTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted"><div class="spinner-border text-success spinner-border-sm me-2"></div> กำลังโหลดรายการขอหนังสือรับรอง...</td></tr>';
    }

    window.callAPI({
        action: 'getCertRequests',
        role: 'Admin',
        empId: 'ALL'
    }).then(function(list) {
        window.allCertRequests = list || [];
        window.filterAdminCertTable();
    }).catch(function() {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">ยังไม่มีข้อมูลคำขอหนังสือรับรอง</td></tr>';
    });
};

window.filterAdminCertTable = function() {
    var searchEl = document.getElementById('searchCertInput');
    var searchVal = searchEl ? searchEl.value.toLowerCase() : '';
    var statusEl = document.getElementById('filterCertStatus');
    var statusVal = statusEl ? statusEl.value : 'all';

    var list = window.allCertRequests || [];

    var pendingCount = list.filter(function(x) { return x.status === 'Pending' || x.status === 'รออนุมัติ'; }).length;
    var approvedCount = list.filter(function(x) { return x.status === 'Approved' || x.status === 'อนุมัติแล้ว'; }).length;

    var stPendingEl = document.getElementById('statCertPending');
    if (stPendingEl) stPendingEl.innerText = pendingCount;
    var stApprovedEl = document.getElementById('statCertApproved');
    if (stApprovedEl) stApprovedEl.innerText = approvedCount;
    var stTotalEl = document.getElementById('statCertTotal');
    if (stTotalEl) stTotalEl.innerText = list.length;

    var badgeTab = document.getElementById('badgeCertPendingCount');
    if (badgeTab) {
        if (pendingCount > 0) {
            badgeTab.innerText = pendingCount;
            badgeTab.classList.remove('d-none');
        } else {
            badgeTab.classList.add('d-none');
        }
    }

    var filtered = list.filter(function(r) {
        var matchSearch = (r.reqId + r.empId + r.empName + r.purpose).toLowerCase().includes(searchVal);
        var matchStatus = true;
        if (statusVal === 'Pending') matchStatus = (r.status === 'Pending' || r.status === 'รออนุมัติ');
        else if (statusVal === 'Approved') matchStatus = (r.status === 'Approved' || r.status === 'อนุมัติแล้ว');
        else if (statusVal === 'Rejected') matchStatus = (r.status === 'Rejected' || r.status === 'ไม่อนุมัติ');
        return matchSearch && matchStatus;
    });

    var tbody = document.getElementById('adminCertTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">ไม่พบรายการขอหนังสือรับรอง</td></tr>';
        return;
    }

    var html = '';
    filtered.forEach(function(r) {
        var statusBadge = '';
        var actionBtns = '';

        if (r.status === 'Pending' || r.status === 'รออนุมัติ') {
            statusBadge = '<span class="badge bg-warning text-dark rounded-pill px-3">รออนุมัติ</span>';
            actionBtns = `
                <button class="btn btn-sm btn-success text-dark fw-bold rounded-pill px-3 me-1 shadow-sm hover-scale" onclick="window.openAdminApproveCertModal('${r.reqId}')">
                    <i class="bi bi-check-circle-fill me-1"></i>อนุมัติ/ออก PDF
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-2 hover-scale" onclick="window.adminRejectCert('${r.reqId}')" title="ปฏิเสธคำขอ">
                    <i class="bi bi-x-lg"></i>
                </button>
            `;
        } else if (r.status === 'Approved' || r.status === 'อนุมัติแล้ว') {
            statusBadge = '<span class="badge bg-success text-dark rounded-pill px-3">อนุมัติแล้ว</span>';
            var pdfBtn = (r.pdfUrl && r.pdfUrl !== '-') ? `<a href="${r.pdfUrl}" target="_blank" class="btn btn-sm btn-outline-info rounded-pill px-3 me-1"><i class="bi bi-file-earmark-pdf me-1"></i>เปิด PDF</a>` : '';
            var reGenBtn = `<button class="btn btn-sm btn-dark border-secondary text-warning rounded-circle me-1" onclick="window.openAdminApproveCertModal('${r.reqId}')" title="แก้ไข/ออก PDF ใหม่"><i class="bi bi-arrow-repeat"></i></button>`;
            var delBtn = `<button class="btn btn-sm btn-dark border-secondary text-danger rounded-circle" onclick="window.adminDeleteCert('${r.reqId}')" title="ลบประวัติ"><i class="bi bi-trash"></i></button>`;
            actionBtns = pdfBtn + reGenBtn + delBtn;
        } else {
            statusBadge = '<span class="badge bg-danger text-white rounded-pill px-3">ไม่อนุมัติ</span>';
            var delBtn2 = `<button class="btn btn-sm btn-dark border-secondary text-danger rounded-circle" onclick="window.adminDeleteCert('${r.reqId}')" title="ลบประวัติ"><i class="bi bi-trash"></i></button>`;
            actionBtns = delBtn2;
        }

        var expText = r.expireDate && r.expireDate !== '-' 
            ? `<div class="small text-info">ออก: ${r.issueDate}</div><div class="small text-warning">หมดอายุ: ${r.expireDate}</div>` 
            : '<span class="text-muted small">-</span>';

        html += `
        <tr>
            <td class="ps-4"><span class="font-monospace text-success fw-bold">${r.reqId}</span><br><small class="text-muted">${r.reqDate}</small></td>
            <td><b class="text-light">${r.empName}</b><br><small class="text-info font-monospace">${r.empId}</small></td>
            <td><span class="badge bg-dark border border-secondary text-secondary fw-normal">${r.position || '-'}</span></td>
            <td><div class="text-light small" style="max-width: 220px; white-space: normal;">${r.purpose || '-'}</div></td>
            <td class="text-center">${expText}</td>
            <td class="text-center">${statusBadge}</td>
            <td class="text-end pe-4 text-nowrap">${actionBtns}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
};

window.openAdminApproveCertModal = function(reqId, directEmpId) {
    var form = document.getElementById('adminCertApproveForm');
    if (form) form.reset();

    var today = new Date();
    var issueInput = document.getElementById('adm_cert_issueDate');
    if (issueInput) issueInput.valueAsDate = today;

    if (reqId) {
        var req = (window.allCertRequests || []).find(function(x) { return x.reqId === reqId; });
        if (!req) return;

        document.getElementById('adm_cert_reqId').value = req.reqId;
        document.getElementById('adm_cert_reqId_show').value = req.reqId;
        document.getElementById('adm_cert_empId').value = req.empId;
        document.getElementById('adm_cert_fullname').value = req.empName;
        document.getElementById('adm_cert_position').value = req.position || 'พนักงาน';
        document.getElementById('adm_cert_startDate').value = req.startDate || '-';
        document.getElementById('adm_cert_purpose').value = req.purpose || '-';
    } else if (directEmpId) {
        var emp = (window.allEmpData || []).find(function(x) { return String(x.id).trim() === String(directEmpId).trim(); });
        if (!emp) return;

        document.getElementById('adm_cert_reqId').value = 'DIRECT';
        document.getElementById('adm_cert_reqId_show').value = 'สร้างโดยตรงโดย Admin (Auto ID)';
        document.getElementById('adm_cert_empId').value = emp.id;
        document.getElementById('adm_cert_fullname').value = emp.name;
        document.getElementById('adm_cert_position').value = emp.position || 'พนักงาน';
        document.getElementById('adm_cert_startDate').value = window.formatDate ? window.formatDate(emp.startDate) : emp.startDate;
        document.getElementById('adm_cert_purpose').value = 'ฝ่ายบุคคล (Admin) ออกเอกสารให้โดยตรง';
    }

    window.updateCertExpPreview();

    var modalEl = document.getElementById('adminCertApproveModal');
    if (modalEl) {
        var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
};

window.updateCertExpPreview = function() {
    var issueVal = document.getElementById('adm_cert_issueDate').value;
    var previewEl = document.getElementById('adm_cert_expPreview');
    if (!previewEl) return;

    var d = issueVal ? new Date(issueVal) : new Date();
    if (isNaN(d.getTime())) {
        previewEl.innerText = '-';
        return;
    }

    var exp = new Date(d.getTime());
    exp.setDate(exp.getDate() + 30);

    var thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    var expThai = exp.getDate() + " " + thaiMonths[exp.getMonth()] + " " + (exp.getFullYear() + 543);
    previewEl.innerText = expThai;
};

window.adminConfirmApproveCert = async function(e) {
    e.preventDefault();

    var btn = document.getElementById('btnAdminApproveCert');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังสร้าง PDF...';
    btn.disabled = true;

    var payload = {
        reqId: document.getElementById('adm_cert_reqId').value,
        empId: document.getElementById('adm_cert_empId').value,
        empName: document.getElementById('adm_cert_fullname').value.trim(),
        position: document.getElementById('adm_cert_position').value.trim(),
        startDate: document.getElementById('adm_cert_startDate').value.trim(),
        issueDate: document.getElementById('adm_cert_issueDate').value,
        purpose: document.getElementById('adm_cert_purpose').value,
        approvedBy: (window.currentUser && window.currentUser.name) ? window.currentUser.name : 'Admin'
    };

    try {
        const res = await window.callAPI({
            action: 'approveWorkCert',
            payload: payload
        });

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (res && res.success) {
            var modalEl = document.getElementById('adminCertApproveModal');
            var modalInst = bootstrap.Modal.getInstance(modalEl);
            if (modalInst) modalInst.hide();

            Swal.fire({
                icon: 'success',
                title: 'อนุมัติและสร้าง PDF สำเร็จ!',
                html: `เอกสารมีอายุ 30 วัน (ใช้ได้ถึง <b>${res.expireDate}</b>)<br><a href="${res.pdfUrl}" target="_blank" class="btn btn-success text-dark fw-bold rounded-pill px-4 mt-3"><i class="bi bi-file-earmark-pdf-fill me-1"></i> เปิดดูไฟล์ PDF</a>`,
                background: '#1a1a1a', color: '#fff'
            });

            window.loadAdminCertData();
        } else {
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message || 'ไม่สามารถสร้าง PDF ได้', background: '#1a1a1a', color: '#fff' });
        }
    } catch (err) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message, background: '#1e1e1e', color: '#fff' });
    }
};

window.adminRejectCert = function(reqId) {
    Swal.fire({
        title: 'ไม่อนุมัติคำขอนี้?',
        text: 'ระบุเหตุผลที่ไม่อนุมัติเพื่อแจ้งให้พนักงานทราบ',
        input: 'text',
        inputPlaceholder: 'เช่น ข้อมูลยังไม่ครบถ้วน หรือ อยู่ระหว่างพิจารณา...',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#555',
        confirmButtonText: 'ยืนยันไม่อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        background: '#1a1a1a', color: '#fff'
    }).then(function(result) {
        if (result.isConfirmed) {
            var reason = result.value || 'ไม่ผ่านการพิจารณาจากฝ่ายบุคคล';
            Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, background: '#1a1a1a', color: '#fff', didOpen: function() { Swal.showLoading(); } });

            window.callAPI({
                action: 'rejectWorkCert',
                reqId: reqId,
                reason: reason
            }).then(function(res) {
                if (res && res.success) {
                    Swal.fire({ icon: 'success', title: 'บันทึกเรียบร้อย', text: res.message, background: '#1a1a1a', color: '#fff' });
                    window.loadAdminCertData();
                } else {
                    Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, background: '#1a1a1a', color: '#fff' });
                }
            });
        }
    });
};

window.adminDeleteCert = function(reqId) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: 'ต้องการลบประวัติคำขอเลขที่ ' + reqId + ' และไฟล์ PDF ใช่หรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#555',
        confirmButtonText: 'ลบทิ้ง!',
        cancelButtonText: 'ยกเลิก',
        background: '#1a1a1a', color: '#fff'
    }).then(function(result) {
        if (result.isConfirmed) {
            Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, background: '#1a1a1a', color: '#fff', didOpen: function() { Swal.showLoading(); } });

            window.callAPI({
                action: 'deleteWorkCert',
                reqId: reqId
            }).then(function(res) {
                if (res && res.success) {
                    Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', text: res.message, background: '#1a1a1a', color: '#fff' });
                    window.loadAdminCertData();
                } else {
                    Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res.message, background: '#1a1a1a', color: '#fff' });
                }
            });
        }
    });
};