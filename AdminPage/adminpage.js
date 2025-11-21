let students = [];
let deletedControlNumbers = [];
let currentFilter = {
    search: '',
    year: ''
};
let isSubmitting = false;
let currentSection = 'home';
let pieChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    loadDataFromFirebase();
    initializeEventListeners();
    showSection('home');
    initializePieChart();
    loadRequestsFromFirebase();
});

// Firebase Data Loading
async function loadDataFromFirebase() {
    try {
        // Load students
        const studentsSnapshot = await dbRefs.students.once('value');
        if (studentsSnapshot.exists()) {
            const studentsData = studentsSnapshot.val();
            students = Object.values(studentsData);
        }
        
        // Load deleted control numbers
        const deletedSnapshot = await dbRefs.deletedControlNumbers.once('value');
        if (deletedSnapshot.exists()) {
            deletedControlNumbers = deletedSnapshot.val() || [];
        }
        
        updateDisplay();
        
        // Listen for real-time updates
        dbRefs.students.on('value', (snapshot) => {
            if (snapshot.exists()) {
                students = Object.values(snapshot.val());
                updateDisplay();
            }
        });
        
    } catch (error) {
        console.error('Error loading data from Firebase:', error);
        showAlert('Failed to load data from server', 'error');
    }
}

// Firebase Data Saving
async function saveToFirebase() {
    try {
        // Convert students array to object with IDs as keys
        const studentsObj = {};
        students.forEach(student => {
            studentsObj[student.id] = student;
        });
        
        await dbRefs.students.set(studentsObj);
        await dbRefs.deletedControlNumbers.set(deletedControlNumbers);
        return true;
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        showAlert('Failed to save data to server', 'error');
        return false;
    }
}

// Load Requests from Firebase
async function loadRequestsFromFirebase() {
    try {
        dbRefs.registrations.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const registrations = Object.values(snapshot.val());
                updateRequestsTable(registrations);
            } else {
                updateRequestsTable([]);
            }
        });
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

// Update Requests Table
function updateRequestsTable(registrations) {
    const tbody = document.getElementById('requestsTableBody');
    const requestCount = document.getElementById('requestCount');
    
    if (!tbody) return;
    
    if (requestCount) {
        requestCount.textContent = registrations.length;
    }
    
    tbody.innerHTML = '';
    
    if (registrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <h3>No pending requests</h3>
                    <p>There are no membership requests at this time.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    registrations.forEach(request => {
        const row = document.createElement('tr');
        const statusClass = request.status || 'pending';
        const statusText = (request.status || 'pending').toUpperCase();
        
        row.innerHTML = `
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${request.studentName || 'N/A'}</td>
            <td>${request.studentNumber || 'N/A'}</td>
            <td>${request.schoolYear || 'N/A'}</td>
            <td>₱${(request.membershipFee || 0).toLocaleString()}</td>
            <td>${new Date(request.submittedAt).toLocaleDateString()}</td>
            <td class="actions">
                <button class="btn btn-success btn-small" onclick="approveRequest('${request.id}')">Approve</button>
                <button class="btn btn-danger btn-small" onclick="denyRequest('${request.id}')">Deny</button>
                ${request.proofOfPayment ? `<button class="btn btn-info btn-small" onclick="viewProof('${request.proofOfPayment}')">View Proof</button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Approve Request
async function approveRequest(requestId) {
    if (!confirm('Approve this membership request?')) return;
    
    try {
        const requestRef = dbRefs.registrations.child(requestId);
        const snapshot = await requestRef.once('value');
        const request = snapshot.val();
        
        if (!request) {
            showAlert('Request not found!', 'error');
            return;
        }
        
        // Add to students
        const studentData = {
            id: Date.now() + Math.random(),
            name: request.studentName,
            studentNumber: request.studentNumber,
            schoolYear: request.schoolYear,
            membershipFee: request.membershipFee,
            controlNumber: generateControlNumber(),
            registrationDate: new Date().toISOString().split('T')[0]
        };
        
        students.push(studentData);
        await saveToFirebase();
        
        // Update request status
        await requestRef.update({
            status: 'approved',
            updatedAt: new Date().toISOString()
        });
        
        showAlert(`Request approved! Control Number: ${studentData.controlNumber}`, 'success');
        updateDisplay();
        
    } catch (error) {
        console.error('Error approving request:', error);
        showAlert('Failed to approve request', 'error');
    }
}

// Deny Request
async function denyRequest(requestId) {
    if (!confirm('Deny this membership request?')) return;
    
    try {
        await dbRefs.registrations.child(requestId).update({
            status: 'denied',
            updatedAt: new Date().toISOString()
        });
        
        showAlert('Request denied', 'success');
    } catch (error) {
        console.error('Error denying request:', error);
        showAlert('Failed to deny request', 'error');
    }
}

// View Proof of Payment
function viewProof(proofUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Proof of Payment</h2>
            <img src="${proofUrl}" style="width: 100%; max-width: 500px; border-radius: 10px;">
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
       window.location.href = '../index.html';
    }
}

function initializeEventListeners() {
    const registrationForm = document.getElementById('registrationForm');
    const editForm = document.getElementById('editForm');
    
    registrationForm.removeEventListener('submit', registerStudent);
    registrationForm.addEventListener('submit', registerStudent);
    
    editForm.removeEventListener('submit', updateStudent);
    editForm.addEventListener('submit', updateStudent);
    
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchStudents();
        }
    });
}

function showSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const targetLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }
    
    currentSection = sectionName;
    
    if (['home', 'statistics', 'members'].includes(sectionName)) {
        updateDisplay();
    }
    
    if (sectionName === 'statistics') {
        setTimeout(() => updatePieChart(), 100);
    }

    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mainWrapper = document.querySelector('.main-wrapper');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
        mainWrapper.classList.toggle('expanded');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('membership_theme', newTheme);
    
    const themeButton = document.querySelector('.theme-toggle');
    themeButton.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('membership_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeButton = document.querySelector('.theme-toggle');
    themeButton.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

function generateControlNumber() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    if (deletedControlNumbers.length > 0) {
        return deletedControlNumbers.shift();
    }
    
    let number = 1;
    let controlNumber;
    
    do {
        const numberStr = String(number).padStart(3, '0');
        controlNumber = `CN-${month}-${day}-${numberStr}`;
        number++;
    } while (students.some(student => student.controlNumber === controlNumber));
    
    return controlNumber;
}

async function registerStudent(e) {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    isSubmitting = true;
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Registering...';
    
    try {
        const studentNumber = document.getElementById('studentNumber').value.trim();
        
        if (!studentNumber) {
            showAlert('Student number is required!', 'error');
            return;
        }
        
        if (students.some(student => student.studentNumber === studentNumber)) {
            showAlert('Student number already exists!', 'error');
            return;
        }
        
        const studentData = {
            id: Date.now() + Math.random(),
            name: document.getElementById('studentName').value.trim(),
            studentNumber: studentNumber,
            schoolYear: document.getElementById('schoolYear').value,
            membershipFee: parseFloat(document.getElementById('membershipFee').value),
            controlNumber: generateControlNumber(),
            registrationDate: new Date().toISOString().split('T')[0]
        };
        
        if (!studentData.name || !studentData.schoolYear || !studentData.membershipFee) {
            showAlert('Please fill in all required fields!', 'error');
            return;
        }
        
        students.push(studentData);
        await saveToFirebase();
        updateDisplay();
        updatePieChart();
        
        document.getElementById('registrationForm').reset();
        document.getElementById('membershipFee').value = '20';
        
        showAlert(`Student registered successfully! Control Number: ${studentData.controlNumber}`, 'success');
        
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Registration failed. Please try again.', 'error');
    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Register Student';
    }
}

function searchStudents() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    currentFilter.search = searchTerm;
    updateDisplay();
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentFilter.search = '';
    updateDisplay();
}

function applyFilters() {
    currentFilter.year = document.getElementById('yearFilter').value;
    updateDisplay();
}

function getFilteredStudents() {
    return students.filter(student => {
        if (currentFilter.search) {
            const searchTerm = currentFilter.search;
            if (!student.name.toLowerCase().includes(searchTerm) && 
                !student.studentNumber.toLowerCase().includes(searchTerm) && 
                !student.controlNumber.toLowerCase().includes(searchTerm)) {
                return false;
            }
        }
        
        if (currentFilter.year && student.schoolYear !== currentFilter.year) {
            return false;
        }
        
        return true;
    });
}

function calculateStats(studentsData) {
    const totalMembers = studentsData.length;
    const totalRevenue = studentsData.reduce((sum, student) => sum + (student.membershipFee || 0), 0);
    
    const yearCounts = {
        '1st Year': 0,
        '2nd Year': 0,
        '3rd Year': 0,
        '4th Year': 0
    };
    
    studentsData.forEach(student => {
        if (yearCounts.hasOwnProperty(student.schoolYear)) {
            yearCounts[student.schoolYear]++;
        }
    });
    
    return {
        totalMembers,
        totalRevenue,
        yearCounts
    };
}

function initializePieChart() {
    const canvas = document.getElementById('pieChart');
    if (!canvas) return;
    
    pieChart = {
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        centerX: 200,
        centerY: 200,
        radius: 150,
        colors: {
            '1st Year': '#28a745',
            '2nd Year': '#ffc107',
            '3rd Year': '#dc3545',
            '4th Year': '#007bff'
        }
    };
    
    updatePieChart();
}

function updatePieChart() {
    if (!pieChart || !pieChart.ctx) return;
    
    const stats = calculateStats(students);
    const yearCounts = stats.yearCounts;
    const total = stats.totalMembers;
    
    document.getElementById('legend1stYear').textContent = yearCounts['1st Year'];
    document.getElementById('legend2ndYear').textContent = yearCounts['2nd Year'];
    document.getElementById('legend3rdYear').textContent = yearCounts['3rd Year'];
    document.getElementById('legend4thYear').textContent = yearCounts['4th Year'];

    pieChart.ctx.clearRect(0, 0, pieChart.canvas.width, pieChart.canvas.height);
    
    if (total === 0) {
        pieChart.ctx.fillStyle = '#e0e0e0';
        pieChart.ctx.beginPath();
        pieChart.ctx.arc(pieChart.centerX, pieChart.centerY, pieChart.radius, 0, 2 * Math.PI);
        pieChart.ctx.fill();
        
        pieChart.ctx.fillStyle = '#666';
        pieChart.ctx.font = '16px Arial';
        pieChart.ctx.textAlign = 'center';
        pieChart.ctx.fillText('No Data Available', pieChart.centerX, pieChart.centerY);
        return;
    }
    
    let currentAngle = -Math.PI / 2;
    const angles = {};
    
    Object.keys(yearCounts).forEach(year => {
        const count = yearCounts[year];
        const percentage = count / total;
        const angle = percentage * 2 * Math.PI;
        
        if (count > 0) {
            angles[year] = {
                start: currentAngle,
                end: currentAngle + angle,
                percentage: percentage
            };
            currentAngle += angle;
        }
    });
    
    Object.keys(angles).forEach(year => {
        const angle = angles[year];
        const color = pieChart.colors[year];
        
        pieChart.ctx.fillStyle = color;
        pieChart.ctx.beginPath();
        pieChart.ctx.moveTo(pieChart.centerX, pieChart.centerY);
        pieChart.ctx.arc(pieChart.centerX, pieChart.centerY, pieChart.radius, angle.start, angle.end);
        pieChart.ctx.closePath();
        pieChart.ctx.fill();
        
        pieChart.ctx.strokeStyle = '#ffffff';
        pieChart.ctx.lineWidth = 2;
        pieChart.ctx.stroke();
        
        if (angle.percentage > 0.05) {
            const labelAngle = angle.start + (angle.end - angle.start) / 2;
            const labelX = pieChart.centerX + Math.cos(labelAngle) * (pieChart.radius * 0.7);
            const labelY = pieChart.centerY + Math.sin(labelAngle) * (pieChart.radius * 0.7);
            
            pieChart.ctx.fillStyle = '#ffffff';
            pieChart.ctx.font = 'bold 14px Arial';
            pieChart.ctx.textAlign = 'center';
            pieChart.ctx.textBaseline = 'middle';
            
            pieChart.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            pieChart.ctx.shadowBlur = 2;
            pieChart.ctx.shadowOffsetX = 1;
            pieChart.ctx.shadowOffsetY = 1;
            
            const percentage = Math.round(angle.percentage * 100);
            pieChart.ctx.fillText(`${percentage}%`, labelX, labelY);
            
            pieChart.ctx.shadowColor = 'transparent';
            pieChart.ctx.shadowBlur = 0;
            pieChart.ctx.shadowOffsetX = 0;
            pieChart.ctx.shadowOffsetY = 0;
        }
    });
}

function updateDisplay() {
    const filteredStudents = getFilteredStudents();
    updateTable(filteredStudents);
    updateStatistics(filteredStudents);
    updateQuickStats();
    
    if (currentSection === 'statistics') {
        updatePieChart();
    }
}

function updateStatistics(filteredStudents = students) {
    const stats = calculateStats(filteredStudents);
    
    const elements = {
        totalMembers: document.getElementById('totalMembers'),
        totalRevenue: document.getElementById('totalRevenue')
    };
    
    if (elements.totalMembers) elements.totalMembers.textContent = stats.totalMembers;
    if (elements.totalRevenue) elements.totalRevenue.textContent = `₱${stats.totalRevenue.toLocaleString()}`;
}

function updateQuickStats() {
    const stats = calculateStats(students);
    
    const quickTotalMembers = document.getElementById('quickTotalMembers');
    const quickTotalRevenue = document.getElementById('quickTotalRevenue');
    
    if (quickTotalMembers) quickTotalMembers.textContent = stats.totalMembers;
    if (quickTotalRevenue) quickTotalRevenue.textContent = `₱${stats.totalRevenue.toLocaleString()}`;
}

function updateTable(filteredStudents = students) {
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;
    
    const filteredCountElement = document.getElementById('filteredCount');
    if (filteredCountElement) {
        filteredCountElement.textContent = filteredStudents.length;
    }
    
    tbody.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="empty-state">
                <h3>No students found</h3>
                <p>No students match your current filters.</p>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    filteredStudents.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.controlNumber || 'N/A'}</td>
            <td>${student.name || 'N/A'}</td>
            <td>${student.studentNumber || 'N/A'}</td>
            <td>${student.schoolYear || 'N/A'}</td>
            <td>₱${(student.membershipFee || 0).toLocaleString()}</td>
            <td>${student.registrationDate || 'N/A'}</td>
            <td class="actions">
                <button class="btn btn-warning btn-small" onclick="editStudent('${student.id}')">Edit</button>
                <button class="btn btn-danger btn-small" onclick="deleteStudent('${student.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editStudent(id) {
    const student = students.find(s => s.id == id);
    if (!student) {
        showAlert('Student not found!', 'error');
        return;
    }
    
    document.getElementById('editId').value = student.id;
    document.getElementById('editName').value = student.name || '';
    document.getElementById('editNumber').value = student.studentNumber || '';
    document.getElementById('editYear').value = student.schoolYear || '';
    document.getElementById('editFee').value = student.membershipFee || 0;
    
    document.getElementById('editModal').style.display = 'block';
}

async function updateStudent(e) {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    isSubmitting = true;
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    try {
        const id = document.getElementById('editId').value;
        const newStudentNumber = document.getElementById('editNumber').value.trim();
        
        if (!newStudentNumber) {
            showAlert('Student number is required!', 'error');
            return;
        }
        
        if (students.some(student => student.studentNumber === newStudentNumber && student.id != id)) {
            showAlert('Student number already exists!', 'error');
            return;
        }
        
        const updatedData = {
            name: document.getElementById('editName').value.trim(),
            studentNumber: newStudentNumber,
            schoolYear: document.getElementById('editYear').value,
            membershipFee: parseFloat(document.getElementById('editFee').value) || 0
        };
        
        if (!updatedData.name || !updatedData.schoolYear) {
            showAlert('Please fill in all required fields!', 'error');
            return;
        }
        
        const studentIndex = students.findIndex(s => s.id == id);
        if (studentIndex !== -1) {
            students[studentIndex] = { ...students[studentIndex], ...updatedData };
            
            await saveToFirebase();
            updateDisplay();
            updatePieChart();
            closeEditModal();
            showAlert('Student updated successfully!', 'success');
        } else {
            showAlert('Student not found!', 'error');
        }
        
    } catch (error) {
        console.error('Update error:', error);
        showAlert('Update failed. Please try again.', 'error');
    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Update Student';
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
        const studentIndex = students.findIndex(s => s.id == id);
        if (studentIndex !== -1) {
            const deletedStudent = students[studentIndex];
            
            if (deletedStudent.controlNumber) {
                deletedControlNumbers.push(deletedStudent.controlNumber);
                deletedControlNumbers.sort();
            }
            
            students.splice(studentIndex, 1);
            await saveToFirebase();
            updateDisplay();
            updatePieChart();
            showAlert('Student deleted successfully!', 'success');
        } else {
            showAlert('Student not found!', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Delete failed. Please try again.', 'error');
    }
}

async function deleteAllMembers() {
    if (!confirm('Are you sure you want to delete ALL students? This action cannot be undone!')) return;
    
    try {
        students = [];
        deletedControlNumbers = [];
        await saveToFirebase();
        updateDisplay();
        updatePieChart();
        showAlert('All students deleted successfully!', 'success');
    } catch (error) {
        console.error('Delete all error:', error);
        showAlert('Delete all failed. Please try again.', 'error');
    }
}

function escapeCSVField(field) {
    if (field == null || field === undefined) return '';
    const fieldStr = String(field);
    if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n') || fieldStr.includes('\r')) {
        return '"' + fieldStr.replace(/"/g, '""') + '"';
    }
    return fieldStr;
}

function saveDataFile() {
    const filteredStudents = getFilteredStudents();
    
    if (filteredStudents.length === 0) {
        showAlert('No data to save!', 'error');
        return;
    }
    
    try {
        const headers = ['Control Number', 'Name', 'Student Number', 'Year Level', 'Fee', 'Date'];
        const csvRows = [headers.join(',')];
        
        filteredStudents.forEach(student => {
            const row = [
                escapeCSVField(student.controlNumber || ''),
                escapeCSVField(student.name || ''),
                escapeCSVField(student.studentNumber || ''),
                escapeCSVField(student.schoolYear || ''),
                escapeCSVField(student.membershipFee || 0),
                escapeCSVField(student.registrationDate || '')
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(dataBlob);
        link.href = url;
        link.download = `membership_data_${new Date().toISOString().split('T')[0]}.csv`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlert(`File saved successfully! ${filteredStudents.length} records exported.`, 'success');
    } catch (error) {
        console.error('Save file error:', error);
        showAlert('Failed to save file. Please try again.', 'error');
    }
}

function loadDataFile() {
    document.getElementById('fileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        showAlert('Please select a valid CSV file!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const csvText = e.target.result;
            const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
            
            if (lines.length === 0) {
                showAlert('The file appears to be empty!', 'error');
                return;
            }
            
            const headers = lines[0].split(',');
            const newStudents = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                if (values.length >= 6) {
                    newStudents.push({
                        id: Date.now() + i,
                        controlNumber: values[0],
                        name: values[1],
                        studentNumber: values[2],
                        schoolYear: values[3],
                        membershipFee: parseFloat(values[4]) || 0,
                        registrationDate: values[5]
                    });
                }
            }
            
            if (confirm(`Load ${newStudents.length} students? This will replace current data.`)) {
                students = newStudents;
                deletedControlNumbers = [];
                await saveToFirebase();
                updateDisplay();
                updatePieChart();
                showAlert(`Successfully loaded ${newStudents.length} students!`, 'success');
            }
        } catch (error) {
            console.error('CSV load error:', error);
            showAlert('Failed to load CSV file.', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

function showAlert(message, type) {
    const alertId = type === 'success' ? 'successAlert' : 'errorAlert';
    const alertElement = document.getElementById(alertId);
    
    if (alertElement) {
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        
        if (alertElement.timeoutId) {
            clearTimeout(alertElement.timeoutId);
        }
        
        alertElement.timeoutId = setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEditModal();
        closeSidebar();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDataFile();
    }
});

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeSidebar();
    }
    
    if (currentSection === 'statistics') {
        setTimeout(() => updatePieChart(), 100);
    }
});

console.log('Admin page with Firebase initialized successfully!');