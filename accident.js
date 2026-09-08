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

// 🟢 ย้ายโค้ดสร้างตัวเลือกเวลามาไว้ในนี้ เพื่อรับประกันว่า HTML Modal โหลดเสร็จแน่นอน
window.openAccidentModal = function() { 
    var form = document.getElementById('accidentForm');
    if(form) form.reset(); 
    
    // โหลดตัวเลือกเวลา
    var timeSelect = document.getElementById('accTime');
    if(timeSelect && timeSelect.options.length <= 1) {
        timeSelect.innerHTML = '<option value="">- เลือกเวลาโดยประมาณ -</option>';
        for (var h = 0; h < 24; h++) {
            var hr = (h < 10 ? "0" : "") + h;
            timeSelect.innerHTML += `<option value="${hr}:00">${hr}:00 น.</option>`;
            timeSelect.innerHTML += `<option value="${hr}:30">${hr}:30 น.</option>`;
        }
    }

    // ซ่อนช่องอื่นๆระบุ และปลด required ออก
    var divCauseOther = document.getElementById('divCauseOther');
    if(divCauseOther) {
        divCauseOther.style.display = "none"; 
        var inputCauseOther = divCauseOther.querySelector('input');
        if(inputCauseOther) inputCauseOther.required = false;
    }

    var divCausedByOther = document.getElementById('divCausedByOther');
    if(divCausedByOther) {
        divCausedByOther.style.display = "none"; 
        var inputCausedByOther = divCausedByOther.querySelector('input');
        if(inputCausedByOther) inputCausedByOther.required = false;
    }

    var modalEl = document.getElementById('accidentModal');
    if(modalEl) new bootstrap.Modal(modalEl).show(); 
};

// 🟢 รองรับการเรียกจากเมนูด่วนในหน้าผู้ใช้งาน (เชื่อมต่อให้ตรงกับโค้ด user.js)
window.u_openAccidentModal = function() {
    window.openAccidentModal();
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

    // 🟢 เอาการทำงานทั้งหมดไว้ใน try-catch ดักจับข้อผิดพลาดป้องกันการพังเงียบๆ
    try {
        var fileInput1 = document.getElementById('accPhoto1'); 
        var photo1B64 = null, photo1Type = null; 
        if (fileInput1 && fileInput1.files.length > 0) { 
            var fileData1 = await window.getBase64Accident(fileInput1.files[0]); 
            photo1B64 = fileData1.base64; 
            photo1Type = fileData1.type; 
        }

        var fileInput2 = document.getElementById('accPhoto2'); 
        var photo2B64 = null, photo2Type = null; 
        if (fileInput2 && fileInput2.files.length > 0) { 
            var fileData2 = await window.getBase64Accident(fileInput2.files[0]); 
            photo2B64 = fileData2.base64; 
            photo2Type = fileData2.type; 
        }

        var empData = window.currentUserData || window.currentUser || {}; 
        
        // ดึงอายุงานอย่างปลอดภัย
        var tenureText = '-';
        if (typeof window.u_calcTenure === 'function') {
            tenureText = window.u_calcTenure(empData.startDate || new Date());
        } else if (typeof window.calcTenure === 'function') {
            tenureText = window.calcTenure(empData.startDate || new Date());
        }
        if (!tenureText) tenureText = '-';

        var trailerPlateEl = document.getElementById('accTrailerPlate');

        var payload = { 
            form: { 
                empId: empData.id || empData.empId || '-', 
                empName: empData.name || '-', 
                idCard: empData.idCardNum || '-', 
                phone: empData.phone || '-', 
                gender: empData.gender || '-', 
                tenure: String(tenureText).replace(/(<([^>]+)>)/gi, ""), 
                
                accDate: document.getElementById('accDate').value, 
                accTime: document.getElementById('accTime').value, 
                location: document.getElementById('accLocation').value, 
                vehicleType: document.getElementById('accVehicleType').value, 
                truckPlate: document.getElementById('accTruckPlate').value, 
                trailerPlate: trailerPlateEl ? (trailerPlateEl.value || '-') : '-', 
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
                    // รีโหลดประวัติผู้ใช้
                    var accList = document.getElementById('u_userAccidentListTab') || document.getElementById('userAccidentListTab'); 
                    if (accList) accList.innerHTML = '<div class="text-center text-muted py-3 small opacity-50"><div class="spinner-border spinner-border-sm text-warning"></div> กำลังโหลด...</div>'; 
                    
                    window.callAPI({ action: 'getAccidentData', role: 'User', empId: window.currentUser.empId }).then(function(data) { 
                        window.globalUserAccidents = data || []; 
                        var accBadge = document.getElementById('u_accCountBadge') || document.getElementById('accCountBadge'); 
                        if (accBadge) accBadge.innerText = window.globalUserAccidents.length; 
                        
                        if (typeof window.u_renderAccidentsList === 'function') window.u_renderAccidentsList();
                        else if (typeof window.renderUserAccidentsList === 'function') window.renderUserAccidentsList(); 
                    }); 
                } 
            }); 
            var mEl = document.getElementById('accidentModal');
            if(mEl) {
                var modalInstance = bootstrap.Modal.getInstance(mEl);
                if(modalInstance) modalInstance.hide();
            }
        } else { 
            Swal.fire({icon: 'error', title: 'ผิดพลาด', text: res.message, background: '#1e1e1e', color: '#fff'}); 
        }
    } catch(err) { 
        btn.innerHTML = originalText; 
        btn.disabled = false; 
        Swal.fire({
            icon: 'error', 
            title: 'เกิดข้อผิดพลาด', 
            text: err.message || 'ไม่สามารถส่งข้อมูลได้เนื่องจากข้อขัดข้อง', 
            background: '#1e1e1e', 
            color: '#fff'
        });
    }
};