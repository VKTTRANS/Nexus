var BACKEND_URL = "https://script.google.com/macros/s/AKfycbyOFq4yA2YaCvA5w9OXlM4wu5lGqCEt6AnMn-2_Pw_Fl-YpIB5hzAFM5YFIVlSPd7Tu-A/exec";
var FLEET_API_URL = "https://script.google.com/macros/s/AKfycbyw0mIjSyoLO_E1RJmsGpBiPNiNVQiotHNcrkgCBg849wjA83Fel4l6VHYSTe0PrIC-/exec";

var AUTO_FILLED_USER = "";
var currentUser = {};
var allEmpData = [];
var modalObj = null;
var allPositionsList = [];
var allHospitals = [];
var allLicenseTypes = [];

var currentUserData = {};
var globalUserWarnings = [];
var globalUserAccidents = [];
var globalYardData = [];

// สำหรับหน้า Admin
var currentDisplayData = [];
var currentSort = { key: 'id', order: 'asc' };
var allAccidentData = [];
var currentAccidentDisplayData = [];
var allWarningData = [];
var currentWarningDisplayData = [];
var recruitDataList = [];

window.onload = async function() {
  await loadAllComponents();
  document.getElementById('globalLoader').style.display = 'none';

  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');
  const tagParam = urlParams.get('tag');

  if (userParam) {
    AUTO_FILLED_USER = userParam;
    if(typeof window.checkAutoLogin === 'function') window.checkAutoLogin();
  } else if (tagParam) {
    try {
      Swal.fire({title: 'กำลังตรวจสอบ Tag NFC...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
      const res = await window.callAPI({ action: 'getUserByNfcTag', tag: tagParam });
      Swal.close();
      if (res && res.username) {
        AUTO_FILLED_USER = res.username;
        if(typeof window.checkAutoLogin === 'function') window.checkAutoLogin();
      }
    } catch(e) { Swal.close(); }
  }

  try {
    var savedSession = localStorage.getItem('hr_user_session');
    if (savedSession) {
      currentUser = JSON.parse(savedSession);
      var now = new Date().getTime();
      if (currentUser.loginTime && (now - currentUser.loginTime > 14400000)) {
          window.logout();
          return;
      }
      if (currentUser && currentUser.role) {
         if (currentUser.role === 'Admin') { 
             window.switchView('view-admin'); 
             if(typeof window.loadAdminData === 'function') window.loadAdminData(); 
         } else if (currentUser.role === 'Recruiter') { 
             window.switchView('view-recruit'); 
             if(typeof window.loadRecruitData === 'function') window.loadRecruitData(); 
         } else if (currentUser.role === 'Viewer') { 
             window.switchView('view-admin'); 
             if(typeof window.loadAdminData === 'function') window.loadAdminData(); 
         } else { 
             window.switchView('view-user'); 
             if(typeof window.loadUserData === 'function') window.loadUserData(); 
         }
         return;
      }
    }
  } catch (e) { console.warn("Local storage blocked:", e); }
  
  if (!AUTO_FILLED_USER) {
    window.switchView('view-login');
  }
};

async function loadAllComponents() {
  const files = ['login.html', 'admin.html', 'recruit.html', 'user.html', 'accident.html'];
  for (let file of files) {
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error("Failed to load " + file);
      const html = await response.text();
      const div = document.createElement('div');
      div.innerHTML = html;
      
      const scripts = div.querySelectorAll('script');
      
      while (div.firstChild) {
        document.body.appendChild(div.firstChild);
      }
      
      scripts.forEach(s => {
        const newScript = document.createElement('script');
        newScript.textContent = s.innerHTML;
        document.body.appendChild(newScript);
      });
    } catch (error) {
      console.error("Component error:", error);
    }
  }
}

window.callAPI = async function(payload) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status === 'success') return result.data;
    throw new Error(result.message);
  } catch (error) {
    console.error("API Fetch Error:", error);
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ฐานข้อมูล VKT ได้', 'error');
    throw error;
  }
};

window.switchView = function(id) { 
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); 
    var targetView = document.getElementById(id);
    if(targetView) {
        targetView.classList.add('active'); 
    }
    if(id === 'view-login' && typeof window.checkAutoLogin === 'function') { window.checkAutoLogin(); }
};

window.logout = function() { 
  try { localStorage.removeItem('hr_user_session'); } catch(e){} 
  currentUser = {}; 
  if(document.getElementById('loginUser')) document.getElementById('loginUser').value = ''; 
  if(document.getElementById('loginPass')) document.getElementById('loginPass').value = ''; 
  if(typeof window.switchAdminTab === 'function') window.switchAdminTab('emp');
  if(document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
  if(document.getElementById('searchAccidentInput')) document.getElementById('searchAccidentInput').value = '';
  if(document.getElementById('searchWarnInput')) document.getElementById('searchWarnInput').value = '';
  if(document.getElementById('showResignedCheck')) document.getElementById('showResignedCheck').checked = false;
  if(document.getElementById('rowsPerPage')) document.getElementById('rowsPerPage').value = '50';
  if(document.getElementById('tableBody')) document.getElementById('tableBody').innerHTML = '';
  if(document.getElementById('adminAccidentTableBody')) document.getElementById('adminAccidentTableBody').innerHTML = '';
  if(document.getElementById('adminWarnTableBody')) document.getElementById('adminWarnTableBody').innerHTML = '';
  window.switchView('view-login'); 
};

window.openPreview = function(rawUrl) {
    if(!rawUrl || rawUrl === '-') return;
    var fileIdMatch = String(rawUrl).match(/[-\w]{25,}/);
    if(fileIdMatch) {
        var fileId = fileIdMatch[0];
        document.getElementById('previewLoading').style.display = 'block';
        document.getElementById('previewImage').src = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1200";
        document.getElementById('previewFullLink').href = "https://drive.google.com/file/d/" + fileId + "/view";
        var previewModal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
        previewModal.show();
    } else if(String(rawUrl).indexOf('http') === 0) {
        window.open(rawUrl, '_blank');
    }
};

window.toggleResignDate = function() { 
    var st = document.getElementById('empStatus').value; 
    var rd = document.getElementById('resignDate'); 
    var divReason = document.getElementById('divResignReason');
    if (st === 'Resigned') { 
        rd.disabled = false; rd.readOnly = false; rd.classList.remove('readonly-field'); divReason.style.display = 'block';
    } else { 
        rd.disabled = true; if(st !== 'Resigned') { rd.value = ''; document.getElementById('resignReason').value = ''; } divReason.style.display = 'none';
    } 
};

window.openModal = function(mode, targetId, preloadedData) { 
    document.getElementById('empForm').reset(); 
    document.getElementById('formMode').value = mode; 
    
    var modalEl = document.getElementById('empModal');
    modalObj = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    
    var targetData = preloadedData || null; 
    if (!targetData && mode !== 'create' && targetId) { 
        targetData = allEmpData.find(x => String(x.id).trim() === String(targetId).trim()); 
    } 
    
    setupModalData(mode, targetData);
    modalObj.show(); 
    
    window.loadSettings(function() {
        if (mode !== 'view' && targetData) {
            window.fillData(targetData, false);
        }
        var isUser = (currentUser.role === 'User');
        if (isUser || mode === 'view' || currentUser.role === 'Viewer') {
            document.querySelectorAll('input[name="posCheckbox"]').forEach(cb => cb.disabled = true);
        }
    }); 
};

function setupModalData(mode, d) {
  var btnSave = document.getElementById('btnSaveModal');
  var viewSection = document.getElementById('viewModeSection');
  var editSection = document.getElementById('editModeSection');
  
  viewSection.style.display = 'none';
  editSection.style.display = 'none';
  btnSave.style.display = 'none';
  
  var lock = (id, state) => { var el = document.getElementById(id); if(el) { el.readOnly = state; el.disabled = state; if(state) el.classList.add('readonly-field'); else el.classList.remove('readonly-field'); } };
  var lockPositions = (state) => { document.querySelectorAll('input[name="posCheckbox"]').forEach(cb => cb.disabled = state); };
  
  var allFields = ['empId','role','username','password','fullname','nickname','startDate','phone','birthDate','gender','ssoType','ssoHosp','idExp','licExp','idCardNum','licNum','licType','resignReason','prefix'];

  if (mode === 'create') {
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-person-plus-fill me-2"></i>เพิ่มพนักงานใหม่';
    editSection.style.display = 'block'; 
    btnSave.style.display = 'block';
    allFields.forEach(f=>lock(f,false));
    lockPositions(false);
    document.getElementById('btnGenId').style.display = 'inline-block'; window.genId();
    document.getElementById('empStatus').value = 'Active'; lock('empStatus', false); window.toggleResignDate();
    
  } else if (mode === 'view' || currentUser.role === 'Viewer') {
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-eye-fill me-2"></i>ดูข้อมูล (Read Only)';
    viewSection.style.display = 'block'; 
    document.getElementById('btnGenId').style.display = 'none';
    if(d) window.fillData(d, true); 

  } else {
    var isUser = (currentUser.role === 'User');
    document.getElementById('modalTitle').innerHTML = isUser ? '<i class="bi bi-pencil-square me-2"></i>แก้ไขข้อมูลส่วนตัว' : '<i class="bi bi-pencil-square me-2"></i>แก้ไขข้อมูลพนักงาน';
    editSection.style.display = 'block'; 
    btnSave.style.display = 'block'; 
    document.getElementById('btnGenId').style.display = 'none';
    
    if(d) window.fillData(d, false);
    lock('empId', true);
    if (isUser) {
       lock('role', true); lock('empStatus', true); lock('resignDate', true); lock('resignReason', true); lock('username', true); 
       lock('fullname', true); lock('prefix', true); lock('startDate', true); lock('gender', true); lock('ssoType', true); 
       lock('birthDate', false); 
       lock('password', false); lock('phone', false); lock('nickname', false); lock('ssoHosp', false);
       lock('idExp', false); lock('licExp', false); 
       lock('idCardNum', false); lock('licNum', false); lock('licType', false);
       lockPositions(true);
    } else {
       lock('role', false); lock('empStatus', false); window.toggleResignDate();
       lock('username', false); lock('password', false); lock('fullname', false); lock('prefix', false); lock('startDate', false); lock('birthDate', false); lock('gender', false);
       lock('ssoType', false); lock('ssoHosp', false); lock('nickname', false);
       lock('idExp', false); lock('licExp', false);
       lock('idCardNum', false); lock('licNum', false); lock('licType', false);
       lock('resignReason', false);
       lockPositions(false); lock('phone', false);
    }
  }
}

function safeDate(d) { if(!d) return ''; try { var date = new Date(d); if(isNaN(date.getTime())) return ''; return date.toISOString().split('T')[0]; } catch(e) { return ''; } }

window.fillData = function(d, isViewMode) { 
    if(!d) return; 
    document.getElementById('empId').value = d.id; 
    document.getElementById('fullname').value = d.name; 
    document.getElementById('prefix').value = ""; 

    document.getElementById('nickname').value = d.nickname || ''; 
    document.getElementById('phone').value = d.phone; 
    document.getElementById('username').value = d.username; 
    document.getElementById('password').value = d.password;
    document.getElementById('role').value = d.role; 
    document.getElementById('gender').value = d.gender || ''; 
    document.getElementById('empStatus').value = d.status || 'Active'; 
    
    document.getElementById('startDate').value = safeDate(d.startDate);
    document.getElementById('resignDate').value = safeDate(d.resignDate); 
    document.getElementById('birthDate').value = safeDate(d.birthDate);
    
    document.getElementById('ssoType').value = d.ssoType || ''; 
    document.getElementById('ssoHosp').value = d.ssoHosp || ''; 
    document.getElementById('idExp').value = safeDate(d.idExp); 
    document.getElementById('licExp').value = safeDate(d.licExp);
    document.getElementById('idCardNum').value = d.idCardNum || ''; 
    document.getElementById('licNum').value = d.licNum || '';
    document.getElementById('licType').value = d.licType || ''; 
    document.getElementById('resignReason').value = d.resignReason || '';
    
    var currentPos = (d.position || '').split(',').map(p => p.trim()); 
    document.querySelectorAll('input[name="posCheckbox"]').forEach(cb => { cb.checked = currentPos.includes(cb.value); }); 
    window.toggleResignDate(); 

    if (isViewMode) {
       document.getElementById('view_fullname').innerText = d.name;
       document.getElementById('view_nickname_badge').innerText = d.nickname ? d.nickname : '-';
       document.getElementById('view_empId').innerText = d.id;
       var statusClass = d.status === 'Active' ? 'bg-success text-black' : (d.status === 'Resigned' ? 'bg-danger text-white' : 'bg-warning text-dark');
       var statusEl = document.getElementById('view_status_badge');
       statusEl.innerText = d.status;
       statusEl.className = 'badge rounded-pill fs-6 px-3 py-2 ' + statusClass;
       
       document.getElementById('view_birthDate').innerText = window.formatDate(d.birthDate);
       document.getElementById('view_age').innerText = window.calcAge(d.birthDate);
       document.getElementById('view_gender').innerText = d.gender || '-';
       document.getElementById('view_phone').innerText = d.phone || '-';
       document.getElementById('view_username').innerText = d.username;
       document.getElementById('view_password').innerText = d.password;
       document.getElementById('view_role').innerText = d.role;
       
       document.getElementById('view_startDate').innerText = window.formatDate(d.startDate);
       document.getElementById('view_tenure').innerHTML = 'อายุงาน: ' + window.calcTenure(d.startDate);
       document.getElementById('view_ssoType').innerText = d.ssoType || '-';
       document.getElementById('view_ssoHosp').innerText = d.ssoHosp || '-';
       
       if(d.status === 'Resigned') {
          document.getElementById('view_resign_section').style.display = 'block';
          document.getElementById('view_resignDate').innerText = window.formatDate(d.resignDate);
          document.getElementById('view_resignReason').innerText = d.resignReason || '-';
       } else {
          document.getElementById('view_resign_section').style.display = 'none';
       }
       
       document.getElementById('view_idCardNum').innerText = d.idCardNum || '-';
       document.getElementById('view_idExp').innerText = d.idExp ? 'หมดอายุ: ' + window.formatDate(d.idExp) : '';
       document.getElementById('view_licType').innerText = d.licType || '-';
       document.getElementById('view_licNum').innerText = d.licNum ? 'เลขที่: ' + d.licNum : '';
       document.getElementById('view_licExp').innerText = d.licExp ? 'หมดอายุ: ' + window.formatDate(d.licExp) : '';
       
       var posContainer = document.getElementById('view_positions_badges');
       posContainer.innerHTML = '';
       if(currentPos.length > 0 && currentPos[0] !== "") {
          currentPos.forEach(p => { posContainer.innerHTML += `<span class="badge bg-dark text-light border border-secondary fw-normal py-2 px-3">${p}</span>`; });
       } else {
          posContainer.innerHTML = '<span class="text-muted small">- ไม่ระบุตำแหน่ง -</span>';
       }
    }
};

window.getSelectedPositions = function() { 
    var s=[]; document.querySelectorAll('input[name="posCheckbox"]:checked').forEach(c=>s.push(c.value)); return s.join(', '); 
};

window.loadSettings = async function(cb) { 
    try {
      const res = await window.callAPI({ action: 'getSettingsData' });
      allPositionsList = res.positions || []; 
      allHospitals = res.hospitals || []; 
      allLicenseTypes = res.licenseTypes || [];

      var c = document.getElementById('positionCheckboxList'); 
      if(c) {
         c.innerHTML=''; 
         allPositionsList.forEach(p => { c.innerHTML+=`<div class="form-check border-bottom py-1 ps-4"><input class="form-check-input" type="checkbox" name="posCheckbox" value="${p}" id="cb_${p}"><label class="form-check-label w-100 cursor-pointer text-truncate" for="cb_${p}" title="${p}">${p}</label></div>`; }); 
      }
      
      var hSelect = document.getElementById('ssoHosp'); 
      if(hSelect) {
         hSelect.innerHTML = '<option value="">- เลือกโรงพยาบาล -</option>'; 
         allHospitals.forEach(h => { hSelect.innerHTML += `<option value="${h}">${h}</option>`; }); 
      }

      var lSelect = document.getElementById('licType');
      if(lSelect) {
         lSelect.innerHTML = '<option value="">- ประเภทใบขับขี่ -</option>';
         allLicenseTypes.forEach(t => { lSelect.innerHTML += `<option value="${t}">${t}</option>`; });
      }

      if(cb) cb();
    } catch(e) {}
};

window.submitEmpForm = async function(e) { 
    e.preventDefault(); 
    Swal.fire({title: 'กำลังบันทึกข้อมูล...', allowOutsideClick:false, didOpen:()=>Swal.showLoading()}); 
    var form = { 
        empId: document.getElementById('empId').value, 
        role: document.getElementById('role').value, 
        status: document.getElementById('empStatus').value, 
        resignDate: document.getElementById('resignDate').value, 
        birthDate: document.getElementById('birthDate').value, 
        gender: document.getElementById('gender').value, 
        username: document.getElementById('username').value, 
        password: document.getElementById('password').value, 
        prefix: document.getElementById('prefix').value, 
        fullname: document.getElementById('fullname').value, 
        nickname: document.getElementById('nickname').value, 
        ssoType: document.getElementById('ssoType').value, 
        ssoHosp: document.getElementById('ssoHosp').value, 
        idExp: document.getElementById('idExp').value, 
        licExp: document.getElementById('licExp').value, 
        idCardNum: document.getElementById('idCardNum').value, 
        licNum: document.getElementById('licNum').value, 
        licType: document.getElementById('licType').value, 
        resignReason: document.getElementById('resignReason').value, 
        position: window.getSelectedPositions(), 
        startDate: document.getElementById('startDate').value, 
        phone: document.getElementById('phone').value, 
        currentUserRole: currentUser.role, 
        filePhoto: await window.getBase64User(document.getElementById('filePhoto').files[0]), 
        fileIdCard: await window.getBase64User(document.getElementById('fileIdCard').files[0]), 
        filePassport: await window.getBase64User(document.getElementById('filePassport').files[0]), 
        fileHouse: await window.getBase64User(document.getElementById('fileHouse').files[0]), 
        fileDrive: await window.getBase64User(document.getElementById('fileDrive').files[0]), 
        fileEdu: await window.getBase64User(document.getElementById('fileEdu').files[0]), 
        fileCriminal: await window.getBase64User(document.getElementById('fileCriminal').files[0]), 
        fileHealth: await window.getBase64User(document.getElementById('fileHealth').files[0]), 
        fileWarn: null, 
        fileOther1: await window.getBase64User(document.getElementById('fileOther1').files[0]), 
        fileOther2: await window.getBase64User(document.getElementById('fileOther2').files[0]) 
    }; 
    try { 
        const res = await window.callAPI({ 
            action: 'handleEmployeeSave', 
            form: form, 
            mode: document.getElementById('formMode').value 
        }); 
        if(res.success) { 
            Swal.fire('สำเร็จ', res.message, 'success'); 
            modalObj.hide(); 
            if(currentUser.role === 'Admin') window.loadAdminData(); 
            else window.loadUserData(); 
        } else { 
            Swal.fire('เกิดข้อผิดพลาด', res.message, 'error'); 
        } 
    } catch(err) {} 
};

window.genId = function() { 
   document.getElementById('empId').value='...'; 
   try {
     window.callAPI({ action: 'getNextEmployeeId' }).then(res => {
         document.getElementById('empId').value = res.empId;
     });
   } catch(e) {}
};

window.getBase64User = function(file) { 
  return new Promise(function(resolve) {
     if (!file) { resolve(null); return; }
     var reader = new FileReader();
     reader.onload = function() { resolve({base64: reader.result.split(',')[1], type: file.type}); };
     reader.readAsDataURL(file);
  });
};

window.calcAge = function(d) { 
    if(!d) return "-"; 
    var today = new Date(); var birthDate = new Date(d); 
    if(isNaN(birthDate)) return "-"; 
    var age = today.getFullYear() - birthDate.getFullYear(); 
    var m = today.getMonth() - birthDate.getMonth(); 
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } 
    return age + " ปี"; 
};

window.formatDate = function(d) { 
    if(!d) return '-'; 
    try {
        var date = new Date(d);
        if(isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('th-TH-u-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' }); 
    } catch(e) { return '-'; }
};

window.calcTenure = function(dateString) { 
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