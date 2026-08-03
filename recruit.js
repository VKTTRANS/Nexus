window.switchRecruitView = function(view) { 
    if(view === 'list') { 
        document.getElementById('recruitListView').classList.remove('d-none'); 
        document.getElementById('recruitDetailView').classList.add('d-none'); 
    } else { 
        document.getElementById('recruitListView').classList.add('d-none'); 
        document.getElementById('recruitDetailView').classList.remove('d-none'); 
    } 
    
    var btnBack = document.getElementById('btnBackToAdmin');
    if(btnBack) {
        btnBack.style.display = (window.currentUser && window.currentUser.role === 'Admin') ? 'inline-block' : 'none';
    }
};

window.loadRecruitData = async function() { 
    var container = document.getElementById('recruitListGroup'); 
    var loader = document.getElementById('recruitLoading'); 
    container.innerHTML = ''; 
    loader.style.display = 'block'; 
    
    var btnBack = document.getElementById('btnBackToAdmin');
    if(btnBack) {
        btnBack.style.display = (window.currentUser && window.currentUser.role === 'Admin') ? 'inline-block' : 'none';
    }

    try { 
        const list = await window.callAPI({ action: 'getCandidateList' }); 
        loader.style.display = 'none'; 
        window.recruitDataList = list || []; 
        if (window.recruitDataList.length === 0) { 
            container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">ไม่พบข้อมูลใบสมัครใหม่</p></div>'; 
            return; 
        } 
        
        var html = ''; 
        window.recruitDataList.forEach(function(c, index) { 
            var d = {}; 
            try { d = JSON.parse(c.rawData); } catch(e) {} 
            var scoreStr = String(d[63] || '0'); 
            var scoreNum = parseFloat(scoreStr.split('/')[0]) || 0; 
            var badgeClass = scoreNum >= 7 ? 'bg-success text-dark' : 'bg-danger text-white'; 
            var badgeText = scoreNum >= 7 ? 'ผ่าน' : 'พิจารณา'; 
            
            html += '<div class="col-md-6 col-lg-4">' +
                '<div class="applicant-list-item h-100" onclick="window.showRecruitDetail(' + index + ')">' +
                    '<div class="p-3">' +
                        '<div class="d-flex justify-content-between mb-3">' +
                            '<span class="badge bg-dark border border-secondary text-muted rounded-pill">#' + (index+1) + '</span>' +
                            '<span class="badge ' + badgeClass + ' rounded-pill"><i class="bi bi-clipboard2-check me-1"></i>' + scoreStr + ' (' + badgeText + ')</span>' +
                        '</div>' +
                        '<div class="d-flex align-items-center mb-3">' +
                            '<div class="flex-shrink-0 me-3 position-relative">' +
                                '<div id="r_img_loader_'+index+'" class="position-absolute top-50 start-50 translate-middle"><div class="spinner-border spinner-border-sm text-secondary" style="width: 1rem; height: 1rem;"></div></div>' +
                                '<img id="r_img_' + index + '" src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" class="rounded-circle border border-secondary position-relative z-1" width="60" height="60" style="object-fit: cover; background: #222;" referrerpolicy="no-referrer">' +
                            '</div>' +
                            '<div class="overflow-hidden"><h6 class="fw-bold text-white mb-1 text-truncate">' + c.name + '</h6><small class="text-success d-block text-truncate"><i class="bi bi-briefcase me-1"></i>' + c.position + '</small></div>' +
                        '</div>' +
                        '<div class="d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-25">' +
                            '<small class="text-muted" style="font-size:0.75rem;"><i class="bi bi-clock me-1"></i>' + c.timestamp.split(' ')[0] + '</small>' +
                            '<small class="text-white fw-bold" style="font-size:0.8rem;">ตรวจสอบ <i class="bi bi-chevron-right"></i></small>' +
                        '</div>' +
                    '</div>' +
                '</div></div>'; 
        }); 
        container.innerHTML = html; 
        loadListImagesSequentially();
    } catch (err) { 
        loader.style.display = 'none'; 
        container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-danger">เกิดข้อผิดพลาดในการดึงข้อมูลใบสมัคร</p></div>'; 
    } 
};

async function loadListImagesSequentially() {
    for (let i = 0; i < window.recruitDataList.length; i++) {
        let c = window.recruitDataList[i];
        if (c.photo && String(c.photo).length > 10) {
            try {
                const res = await window.callAPI({ action: 'getDriveImageBase64', url: c.photo });
                if (res && res.base64) {
                    let imgEl = document.getElementById('r_img_' + i);
                    if (imgEl) imgEl.src = res.base64;
                }
            } catch(e) {}
        }
        let loader = document.getElementById('r_img_loader_' + i);
        if (loader) loader.style.display = 'none';
    }
}

window.showRecruitDetail = async function(index) { 
    var c = window.recruitDataList[index]; 
    if (!c) return; 
    
    Swal.fire({ title: 'กำลังเตรียมข้อมูล...', allowOutsideClick: false, background: '#1a1a1a', color: '#fff', didOpen: () => { Swal.showLoading(); } });

    var d = {}; 
    try { d = JSON.parse(c.rawData); } catch(e) {} 
    
    document.getElementById('d_name').innerText = c.name; 
    document.getElementById('d_pos').innerHTML = '<i class="bi bi-briefcase me-2"></i>' + c.position; 
    var phoneStr = c.phone || '-';
        if (phoneStr !== '-') {
            // ใช้แท็ก <a> และ href="tel:เบอร์" เพื่อให้กดแล้วโทรออกได้ทันที
            document.getElementById('d_phone').innerHTML = '<a href="tel:' + phoneStr + '" class="text-info text-decoration-none border-bottom border-info border-opacity-50 pb-1 hover-scale d-inline-block"><i class="bi bi-telephone-outbound me-1"></i>' + phoneStr + '</a>';
        } else {
            document.getElementById('d_phone').innerText = '-';
        }
    
    var imgEl = document.getElementById('d_photo'); 
    imgEl.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; 
    if (c.photo && String(c.photo).length > 10) { 
        try { 
            const res = await window.callAPI({ action: 'getDriveImageBase64', url: c.photo }); 
            if (res && res.base64) { imgEl.src = res.base64; } 
        } catch(e) {} 
    } 
    
    var bDate = '-'; 
    if(d[5]) { try { bDate = new Date(d[5]).toLocaleDateString('th-TH'); } catch(e){} } 
    document.getElementById('d_birth').innerText = bDate; 
    document.getElementById('d_age').innerText = d[6] ? d[6] + ' ปี' : '-'; 
    document.getElementById('d_idcard').innerText = d[12] || '-'; 
    document.getElementById('d_licType').innerText = d[14] || '-'; 
    
    var expText = '-'; 
    if(d[16]) { try { expText = new Date(d[16]).toLocaleDateString('th-TH'); } catch(e) { expText = String(d[16]||'-'); } } 
    document.getElementById('d_licExp').innerText = expText; 
    document.getElementById('d_salary').innerText = d[20] ? window.numberWithCommas(d[20]) + ' บาท' : '-'; 
    
    var rawScore = String(d[63] || '0'); 
    var sNum = parseFloat(rawScore.split('/')[0]) || 0; 
    var badgeEl = document.getElementById('d_score_badge');
    
    if (sNum >= 7) {
        badgeEl.className = "badge bg-success text-dark px-3 py-2 rounded-pill shadow-sm";
        badgeEl.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>คะแนนสอบ: ' + rawScore + ' (ผ่าน)';
    } else {
        badgeEl.className = "badge bg-danger text-white px-3 py-2 rounded-pill shadow-sm";
        badgeEl.innerHTML = '<i class="bi bi-x-circle-fill me-1"></i>คะแนนสอบ: ' + rawScore + ' (พิจารณา)';
    }
    
    var docHTML = ''; 
    var docMap = [ 
        {n: 'รูปถ่ายหน้าตรง', i: 53}, 
        {n: 'บัตร ปชช. (หน้า)', i: 54}, {n: 'บัตร ปชช. (หลัง)', i: 55}, {n: 'ใบขับขี่', i: 56}, 
        {n: 'ทะเบียนบ้าน', i: 57}, {n: 'วุฒิการศึกษา', i: 58}, {n: 'ประวัติอาชญากรรม', i: 59}, 
        {n: 'ใบรับรองแพทย์', i: 60}, {n: 'เอกสารอื่นๆ 1', i: 61}, {n: 'เอกสารอื่นๆ 2', i: 62} 
    ]; 
    docMap.forEach(function(k) { 
        var val = String(d[k.i] || ''); 
        if(val.length > 5 && val.indexOf('http') !== -1) { 
            docHTML += '<a href="' + val + '" target="_blank" class="btn btn-sm btn-dark border-secondary text-light hover-scale mb-2 me-1"><i class="bi bi-file-earmark-check me-2 text-success"></i>' + k.n + '</a>'; 
        } 
    }); 
    if(c.pdf && String(c.pdf).indexOf('http') !== -1) { 
        docHTML += '<a href="' + c.pdf + '" target="_blank" class="btn btn-sm btn-warning fw-bold text-dark hover-scale mb-2 me-1"><i class="bi bi-file-pdf-fill me-2"></i>PDF ใบสมัคร</a>'; 
    } 
    document.getElementById('d_docs_links').innerHTML = docHTML || '<span class="text-muted small opacity-50">- ไม่มีเอกสารแนบ -</span>'; 
    
    document.getElementById('btnApprove').onclick = function() { window.processApprove(c.rowIndex, c.rawData); }; 
    document.getElementById('btnReject').onclick = function() { window.processReject(c.rowIndex); }; 
    
    Swal.close();
    window.switchRecruitView('detail'); 
};

window.processApprove = function(idx, raw) { 
    setTimeout(function() { 
        Swal.fire({ 
            title: 'ยืนยันรับเข้าทำงาน?', text: 'ระบุเงินเดือนที่อนุมัติ (ถ้ามี)', input: 'text', inputPlaceholder: 'เช่น 15,000', 
            background: 'rgba(20,20,20,0.95)', color: '#fff', showCancelButton: true, confirmButtonColor: '#00E676', cancelButtonColor: '#555', confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก', 
            didOpen: function() { try { Swal.getInput().focus(); } catch(e) {} } 
        }).then(async function(result) { 
            if (result.isConfirmed) { 
                var approvedSalary = result.value || ""; 
                Swal.fire({title:'กำลังประมวลผล...', background:'rgba(20,20,20,0.95)', color:'#fff', didOpen:function(){Swal.showLoading()}}); 
                try { 
                    const res = await window.callAPI({ action: 'approveCandidate', rowIndex: idx, candidateJson: raw, approvedSalary: approvedSalary }); 
                    Swal.fire({title:'สำเร็จ', text: res.message, icon:'success', background:'rgba(20,20,20,0.95)', color:'#fff'}); 
                    window.switchRecruitView('list'); 
                    window.loadRecruitData(); 
                    if(typeof window.loadAdminData === 'function') window.loadAdminData(); 
                } catch(err) { 
                    Swal.fire({title:'ผิดพลาด', text: err.message, icon:'error', background:'rgba(20,20,20,0.95)', color:'#fff'}); 
                } 
            } 
        }); 
    }, 100); 
};

window.processReject = function(idx) { 
    Swal.fire({ 
        title: 'ปฏิเสธใบสมัคร?', text: 'โปรดระบุเหตุผลในการปฏิเสธ (ถ้ามี)', input: 'text', inputPlaceholder: 'เช่น เอกสารไม่ครบ, คุณสมบัติไม่ตรง...', icon: 'warning', 
        background: 'rgba(20,20,20,0.95)', color: '#fff', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#555', confirmButtonText: 'ยืนยันปฏิเสธ', cancelButtonText: 'ยกเลิก'
    }).then(async function(result) { 
        if (result.isConfirmed) { 
            var reason = result.value || "ไม่ผ่านการพิจารณา";
            Swal.fire({title:'กำลังประมวลผล...', background:'rgba(20,20,20,0.95)', color:'#fff', didOpen:function(){Swal.showLoading()}}); 
            try { 
                const res = await window.callAPI({ action: 'rejectCandidate', rowIndex: idx, reason: reason }); 
                Swal.fire({title:'เรียบร้อย', text: res.message, icon:'success', background:'rgba(20,20,20,0.95)', color:'#fff'}); 
                window.switchRecruitView('list'); 
                window.loadRecruitData(); 
            } catch(err) { 
                Swal.fire({title:'ผิดพลาด', text: err.message, icon:'error', background:'rgba(20,20,20,0.95)', color:'#fff'}); 
            } 
        } 
    }); 
};

window.numberWithCommas = function(x) {
    if (!x && x !== 0) return "0";
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? parts.join(".") : parts[0];
};