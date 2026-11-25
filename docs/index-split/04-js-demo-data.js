function demo(a,b){
  const D={};TB.forEach(t=>D[t]=[]);
  D.ward=[]; // [เพิ่มใหม่] ข้อมูลตัวอย่างหอผู้ป่วย (ผู้ป่วยใน)
  D.ipd_pttype=[]; // [เพิ่มใหม่] ข้อมูลตัวอย่างสิทธิผู้ป่วยใน
  let i=0;const R=n=>Math.round(Math.random()*n);
  for(let s=a;s<=b;s=addD(s,1),i++){
    const w=1+.15*Math.sin(i/9);
    D.daily.push({record_date:s,opd_daily_count:Math.round(230*w)+R(30),ipd_new_admit_daily:R(8)+14,ipd_discharged_daily:R(8)+13,ipd_avg_length_of_stay:3.5+Math.random(),ipd_current_beds:Math.round(60*w),ipd_total_beds:80,opd_his_income:Math.round(420e3*w),ipd_his_discharge_income:Math.round(260e3*w),er_his_income:Math.round(60e3*w),readmit_28days_pct:6+Math.random()*3,avg_wait_reg_to_triage:8+R(4),avg_wait_for_doctor:22+R(8),avg_doctor_consult_time:11+R(5),avg_wait_for_pharmacy:14+R(6),avg_total_process_time:55+R(15)});
    D.hourly.push({record_date:s,patient_type:'ER',time_hour:'08:00',service_count:R(15)+25});
    // [แก้ไข] ข้อมูลตัวอย่างแผนก: เพิ่มรหัสแผนก รายรับ เบิกตามสิทธิ และชำระเอง เพื่อให้การ์ดรายรับมีข้อมูลทดลอง
    [['อายุรกรรม',70,'001'],['กุมารเวช',45,'002'],['ศัลยกรรม',35,'003'],['สูติ-นรีเวช',30,'004']].forEach(([d,n,c])=>{ // วนแต่ละแผนก (ชื่อ, ฐานจำนวนผู้ป่วย, รหัสแผนก)
      const v=n+R(15); // จำนวนผู้ป่วยของวันนั้น (เหมือนเดิม)
      const inc=v*320; // รายรับตัวอย่าง = จำนวนผู้ป่วย × 320 บาท
      const paid=Math.round(inc*(.04+Math.random()*.1)); // ส่วนที่ผู้ป่วยชำระเอง สุ่ม 4-14% ของรายรับ
      D.department.push({record_date:s,main_dep:c,department:d,visit_count:v,his_income:inc,uc_money:inc-paid,paid_money:paid}); // เพิ่มแถวข้อมูลตัวอย่าง
    });
    // [แก้ไข] ข้อมูลตัวอย่างสิทธิ: เพิ่มยอดเบิกตามสิทธิและชำระเอง
    [['UC',.6],['ประกันสังคม',.25],['ชำระเงินเอง',.15]].forEach(([d,p])=>{ // วนแต่ละสิทธิ (ชื่อ, สัดส่วนรายรับ)
      const inc=Math.round(300e3*p*w); // รายรับของสิทธินั้น (เหมือนเดิม)
      const paid=d==='ชำระเงินเอง'?inc:Math.round(inc*.05); // สิทธิ "ชำระเงินเอง" ผู้ป่วยจ่ายทั้งหมด ส่วนอื่นจ่ายเอง 5%
      D.pttype.push({record_date:s,pttype_name:d,his_income:inc,uc_money:inc-paid,paid_money:paid}); // เพิ่มแถวข้อมูลตัวอย่าง
    });
    // [เพิ่มใหม่] ข้อมูลตัวอย่างหอผู้ป่วยใน: รายรับตามจำนวนผู้ป่วยที่จำหน่าย
    [['W1','ตึกผู้ป่วยใน 1',9,30],['W2','ตึกผู้ป่วยใน 2',8,30],['W3','หลังคลอด',2,20]].forEach(([c,nm,n,bd])=>{ // วนแต่ละหอ (รหัส, ชื่อ, ฐานจำนวนจำหน่าย)
      const an=n+R(3); // จำนวนผู้ป่วยจำหน่ายของวันนั้น
      const inc=an*14000; // รายรับตัวอย่าง = จำนวนจำหน่าย × 14,000 บาท
      const paid=Math.round(inc*.05); // ผู้ป่วยชำระเอง 5%
      D.ward.push({record_date:s,ward:c,ward_name:nm,bed_count:bd,bed_used:Math.min(bd,Math.round(bd*(.55+Math.random()*.4))),patient_count:an,discharge_an_count:an,his_income:inc,uc_money:inc-paid,paid_money:paid}); // เพิ่มแถวหอผู้ป่วย
    });
    // [เพิ่มใหม่] ข้อมูลตัวอย่างสิทธิผู้ป่วยใน
    [['บัตรทอง',.55],['เบิกกรมบัญชีกลาง',.2],['ประกันสังคม',.15],['ชำระเงินเอง',.1]].forEach(([nm,p])=>{ // วนแต่ละสิทธิ (ชื่อ, สัดส่วน)
      const inc=Math.round(120e3*p*w); // รายรับของสิทธินั้น
      const paid=nm==='ชำระเงินเอง'?inc:Math.round(inc*.03); // ชำระเอง: ทั้งหมด หรือ 3%
      D.ipd_pttype.push({record_date:s,pttype_name:nm,discharge_an_count:Math.max(1,Math.round(inc/14000)),his_income:inc,uc_money:inc-paid,paid_money:paid}); // เพิ่มแถวสิทธิผู้ป่วยใน
    });
    [['Level 1',1],['Level 2',6],['Level 3',14],['Level 4',9],['Level 5',3]].forEach(([d,n],j)=>D.er_triage.push({record_date:s,triage_level_id:j+1,triage_level_name:d,patient_count:n+R(3)}));
    [['0033','นพ.สมชาย','กุมารเวชกรรม'],['0152','นพ.สมหญิง','อายุรกรรม'],['373','พญ.สมศรี','สูตินรีเวชกรรม']].forEach(([c,n,k])=>D.doctor_clinic.push({record_date:s,doctor_code:c,doctor_name:n,clinic_name:k,visit_count:R(20)+25,patient_count:R(15)+22,admit_count:R(4)}));
  }
  D.bed_occupancy=D.ward.map(r=>({record_date:r.record_date,ward:r.ward,ward_name:r.ward_name,total_beds:r.bed_count,used_beds:r.bed_used})); // ตัวอย่างตาราง hospital_bed_occupancy_stats
  return D;
}

