window.checkAutoLogin = function() {
    if (typeof window.AUTO_FILLED_USER !== 'undefined' && window.AUTO_FILLED_USER && window.AUTO_FILLED_USER.trim() !== "") {
        var uInput = document.getElementById('loginUser');
        var pInput = document.getElementById('loginPass');
        if (uInput) {
            uInput.value = window.AUTO_FILLED_USER;
            uInput.style.borderColor = '#00E676';
            uInput.style.boxShadow = '0 0 15px rgba(0, 230, 118, 0.3)';
            uInput.style.transform = 'translateY(-2px)';
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'พบข้อมูลพนักงาน: ' + window.AUTO_FILLED_USER, text: 'กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน', showConfirmButton: false, timer: 3000, background: 'rgba(20,20,20,0.95)', color: '#fff', iconColor: '#00E676' });
            if (pInput) { setTimeout(function() { pInput.value = ''; pInput.focus(); }, 500); }
        }
        window.AUTO_FILLED_USER = ""; 
    }
};

window.performLogin = async function(e) {
    e.preventDefault(); 
    Swal.fire({ title: 'กำลังตรวจสอบ...', text: 'กรุณารอสักครู่', background: 'rgba(20,20,20,0.95)', color: '#fff', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
    var u = document.getElementById('loginUser').value;
    var p = document.getElementById('loginPass').value;
    try {
        const res = await window.callAPI({ action: 'loginUser', username: u, password: p });
        Swal.close();
        if(res.success){ 
            window.currentUser = res; 
            try { localStorage.setItem('hr_user_session', JSON.stringify(res)); } catch(err) {}
            
            if(res.role === 'Admin') { 
                window.switchView('view-admin'); 
                if(typeof window.loadAdminData === 'function') window.loadAdminData(); 
            } 
            else if(res.role === 'Recruiter') { 
                window.switchView('view-recruit'); 
                if(typeof window.loadRecruitData === 'function') window.loadRecruitData(); 
            }
            else if(res.role === 'Viewer') { 
                window.switchView('view-admin'); 
                if(typeof window.loadAdminData === 'function') window.loadAdminData(); 
            }
            else { 
                window.switchView('view-user'); 
                if(typeof window.loadUserData === 'function') window.loadUserData(); 
            }
        } else { 
            Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: res.message, background: 'rgba(20,20,20,0.95)', color: '#fff', confirmButtonColor: '#d33' }); 
        }
    } catch(err) { }
};

window.openRecoverModal = function(e) {
    e.preventDefault();
    document.getElementById('recoverForm').reset();
    document.getElementById('recoverResult').classList.add('d-none');
    document.getElementById('recoverActionBtns').classList.remove('d-none');
    new bootstrap.Modal(document.getElementById('recoverModal')).show();
};

window.submitRecoverAccount = async function(e) {
    e.preventDefault();
    var idCard = document.getElementById('recoverIdCard').value.replace(/-/g, '').trim();
    var phone = document.getElementById('recoverPhone').value.replace(/-/g, '').trim();
    
    if(idCard.length !== 13) {
        Swal.fire({icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก', background: '#1e1e1e', color: '#fff'});
        return;
    }
    if(phone.length < 9) {
        Swal.fire({icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง', background: '#1e1e1e', color: '#fff'});
        return;
    }

    var btn = document.getElementById('btnCheckRecover');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังตรวจสอบ...';
    btn.disabled = true;

    try {
        const res = await window.callAPI({ action: 'recoverAccount', idCard: idCard, phone: phone });
        
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (res && res.success) {
            document.getElementById('resUsername').innerText = res.username;
            document.getElementById('resPassword').innerText = res.password;
            document.getElementById('recoverResult').classList.remove('d-none');
            document.getElementById('recoverActionBtns').classList.add('d-none');
        } else {
            Swal.fire({icon: 'error', title: 'ไม่พบข้อมูล', text: res.message || 'ข้อมูลไม่ตรงกับในระบบ กรุณาลองใหม่อีกครั้ง', background: '#1e1e1e', color: '#fff'});
        }
    } catch (err) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        Swal.fire({icon: 'error', title: 'การเชื่อมต่อล้มเหลว', text: 'ระบบค้นหายังไม่พร้อมใช้งาน', background: '#1e1e1e', color: '#fff'});
    }
};

window.useRecoveredAccount = function() {
    var u = document.getElementById('resUsername').innerText;
    var p = document.getElementById('resPassword').innerText;
    
    document.getElementById('loginUser').value = u;
    document.getElementById('loginPass').value = p;
    
    bootstrap.Modal.getInstance(document.getElementById('recoverModal')).hide();
    setTimeout(function() { document.querySelector('#view-login form button[type="submit"]').click(); }, 300);
};