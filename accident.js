// สร้างตัวเลือกเวลาอัตโนมัติ
(function() {
    var timeSelect = document.getElementById('accTime');
    if(timeSelect) {
        timeSelect.innerHTML = '<option value="">- เลือกเวลาโดยประมาณ -</option>';
        for (var h = 0; h < 24; h++) {
            var hr = (h < 10 ? "0" : "") + h;
            timeSelect.innerHTML += `<option value="${hr}:00">${hr}:00 น.</option>`;
            timeSelect.innerHTML += `<option value="${hr}:30">${hr}:30 น.</option>`;
        }
    }
})();

window.toggleAccOther = function(selectId, divId) { 
    var val = document.getElementById(selectId).value; 
    var div = document.getElementById(divId); 
    var input = div.querySelector('input'); 
    
    if (val === "อื่นๆ ระบุ") { 
        div.style.display = "block"; 
        input.required = true; 
    } else { 
        div.style.display = "none"; 
        input.required = false; 
        input.value = ""; 
    } 
};

window.openAccidentModal = function() { 
    document.getElementById('accidentForm').reset(); 
    document.getElementById('divCauseOther').style.display = "none"; 
    document.getElementById('divCausedByOther').style.display = "none"; 
    new bootstrap.Modal(document.getElementById('accidentModal')).show(); 
};

window.getBase64Accident = function(file) { 
    return new Promise(function(resolve) { 
        var reader = new FileReader(); 
        reader.onload = function() { resolve({base64: reader.result.split(',')[1], type: file.type}); }; 
        reader.readAsDataURL(file); 
    }); 
};

window.submitAccident = async function(e) {
    e.preventDefault();
    
    var btn = document.getElementById('btnSubmitAccident'); 
    var originalText = btn.innerText; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังประมวลผล...'; 
    btn.disabled = true;

    var fileInput1 = document.getElementById('accPhoto1'); 
    var photo1B64 = null, photo1Type = null; 
    if (fileInput1.files.length > 0) { 
        var fileData1 = await window.getBase64Accident(fileInput1.files[0]); 
        photo1B64 = fileData1.base64; 
        photo1Type = fileData1.type; 
    }

    var fileInput2 = document.getElementById('accPhoto2'); 
    var photo2B64 = null, photo2Type = null; 
    if (fileInput2.files.length > 0) { 
        var fileData2 = await window.getBase64Accident(fileInput2.files[0]); 
        photo2B64 = fileData2.base64; 
        photo2Type = fileData2.type; 
    }

    var empData = window.currentUserData || window.currentUser || {}; 
    var tenureText = typeof window.calcTenure === 'function' ? window.calcTenure(empData.startDate || new Date()) : '-';

    var payload = { 
        form: { 
            empId: empData.id || empData.empId, 
            empName: empData.name, 
            idCard: empData.idCardNum || '-', 
            phone: empData.phone || '-', 
            gender: empData.gender || '-', 
            tenure: tenureText.replace(/(<([^>]+)>)/gi, ""), 
            
            accDate: document.getElementById('accDate').value, 
            accTime: document.getElementById('accTime').value, 
            location: document.getElementById('accLocation').value, 
            vehicleType: document.getElementById('accVehicleType').value, 
            truckPlate: document.getElementById('accTruckPlate').value, 
            trailerPlate: document.getElementById('accTrailerPlate').value || '-', 
            cause: document.getElementById('accCause').value, 
            causeOther: document.getElementById('accCauseOther').value, 
            causedBy: document.getElementById('accCausedBy').value, 
            causedByOther: document.getElementById('accCausedByOther').value, 
            damage: document.getElementById('accDamage').value, 
            detail: document.getElementById('accDetail').value, 
            
            filePhotoBase64: photo1B64, 
            filePhotoType: photo1Type, 
            filePhoto2Base64: photo2B64, 
            filePhoto2Type: photo2Type 
        } 
    };

    try {
      const res = await window.callAPI({ action: 'submitAccidentReport', ...payload }); 
      btn.innerHTML = originalText; 
      btn.disabled = false;
      
      if(res.success) { 
          Swal.fire({ 
              icon: 'success', 
              title: 'ส่งรายงานสำเร็จ', 
              html: 'บันทึกข้อมูลเรียบร้อยแล้ว<br>เลขที่อ้างอิง: <b class="text-success">' + res.docNo + '</b>', 
              background: '#1e1e1e', 
              color: '#fff' 
          }).then(() => { 
              if (typeof window.currentUser !== 'undefined' && window.currentUser.role === 'Admin') { 
                  if (typeof window.loadAdminData === 'function') window.loadAdminData(); 
              } else if (typeof window.currentUser !== 'undefined' && window.currentUser.role === 'User') { 
                  var accList = document.getElementById('userAccidentListTab'); 
                  if (accList) accList.innerHTML = '<div class="text-center text-muted py-3 small opacity-50"><div class="spinner-border spinner-border-sm text-warning"></div> กำลังโหลด...</div>'; 
                  window.callAPI({ action: 'getAccidentData', role: 'User', empId: window.currentUser.empId }).then(function(data) { 
                      window.globalUserAccidents = data || []; 
                      var accBadge = document.getElementById('accCountBadge'); 
                      if (accBadge) accBadge.innerText = window.globalUserAccidents.length; 
                      if (typeof window.renderUserAccidentsList === 'function') window.renderUserAccidentsList(); 
                  }); 
              } 
          }); 
          bootstrap.Modal.getInstance(document.getElementById('accidentModal')).hide();
      } else { 
          Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message, background: '#1e1e1e', color: '#fff'}); 
      }
    } catch(err) { 
        btn.innerHTML = originalText; 
        btn.disabled = false; 
    }
};