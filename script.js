  const firebaseConfig = {
    apiKey: "AIzaSyDXkN-mx1D1tGmf3Mhcn5G5un6DXrD3sDU",
    authDomain: "knou-study-planner.firebaseapp.com",
    projectId: "knou-study-planner",
    storageBucket: "knou-study-planner.firebasestorage.app",
    messagingSenderId: "643362645916",
    appId: "1:643362645916:web:b2a310307c214a66a48a59"
  };

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM 요소 가져오기
const courseNameInput = document.getElementById('course-name-input');
const addCourseBtn = document.getElementById('add-course-btn');
const courseList = document.getElementById('course-list');
const courseCardTemplate = document.getElementById('course-card-template');

// 상태값 정의
const STATUS = {
    NOT_STARTED: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2
};

const STATUS_INFO = {
    [STATUS.NOT_STARTED]: { text: '시작 전', class: 'status-0' },
    [STATUS.IN_PROGRESS]: { text: '수강 중', class: 'status-1' },
    [STATUS.COMPLETED]: { text: '수강 완료', class: 'status-2' }
};

const getFormattedDate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const loadCourses = async () => {
    courseList.innerHTML = '';
    try {
        const snapshot = await db.collection('courses').orderBy('createdAt', 'desc').get();
        snapshot.forEach(doc => {
            const course = doc.data();
            course.id = doc.id;
            renderCourseCard(course);
        });
    } catch (error) {
        console.error("Error loading courses: ", error);
        alert("데이터를 불러오는 데 실패했습니다.");
    }
};

// 과목 카드 하나를 화면에 그리는 함수 (대폭 수정됨)
const renderCourseCard = (course) => {
    const card = courseCardTemplate.content.cloneNode(true);
    const courseCardElement = card.querySelector('.course-card');
    courseCardElement.dataset.id = course.id;
    card.querySelector('.course-title').textContent = course.name;

    const progressGrid = card.querySelector('.progress-grid');
    for (let i = 0; i < 15; i++) {
        const week = i + 1;

        // === 오류 해결을 위한 데이터 형식 호환성 처리 START ===
        let weekData;
        const progressItem = course.progress[i];

        if (typeof progressItem === 'object' && progressItem !== null) {
            // 새로운 데이터 형식 ({status, completedDate})
            weekData = progressItem;
        } else {
            // 기존 데이터 형식 (숫자) 또는 데이터가 없는 경우
            weekData = { status: progressItem || STATUS.NOT_STARTED, completedDate: null };
        }
        // === 호환성 처리 END ===

        const status = weekData.status;
        const completedDate = weekData.completedDate;

        const weekItem = document.createElement('div');
        weekItem.className = 'week-item';
        
        const label = document.createElement('label');
        label.textContent = `${week}주차`;
        
        const select = document.createElement('select');
        select.className = 'status-select';
        select.dataset.week = i;

        for (const key in STATUS_INFO) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = STATUS_INFO[key].text;
            if (parseInt(key) === status) {
                option.selected = true;
            }
            select.appendChild(option);
        }
        
        select.classList.add(STATUS_INFO[status].class);
        
        const dateElement = document.createElement('div');
        dateElement.className = 'completion-date';
        if (completedDate) {
            dateElement.textContent = completedDate;
        }

        // === 날짜 수정 기능 START ===
        dateElement.addEventListener('click', () => {
            if (weekData.status !== STATUS.COMPLETED) return; // '수강완료' 상태일 때만 수정 가능

            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.className = 'date-input';
            dateInput.value = dateElement.textContent;
            
            weekItem.replaceChild(dateInput, dateElement);
            dateInput.focus();

            const saveDate = () => {
                const newDate = dateInput.value;
                dateElement.textContent = newDate;
                weekItem.replaceChild(dateElement, dateInput);
                if (completedDate !== newDate) {
                    updateCompletionDate(course.id, i, newDate);
                }
            };

            dateInput.addEventListener('blur', saveDate);
            dateInput.addEventListener('change', saveDate);
        });
        // === 날짜 수정 기능 END ===

        select.addEventListener('change', (e) => {
            const newStatus = parseInt(e.target.value);
            updateStatus(course.id, i, newStatus);
            select.className = 'status-select';
            select.classList.add(STATUS_INFO[newStatus].class);
            
            if (newStatus === STATUS.COMPLETED) {
                const newDate = getFormattedDate();
                dateElement.textContent = newDate;
            } else {
                dateElement.textContent = '';
            }
        });

        weekItem.appendChild(label);
        weekItem.appendChild(select);
        weekItem.appendChild(dateElement);
        progressGrid.appendChild(weekItem);
    }
    
    card.querySelector('.delete-course-btn').addEventListener('click', () => {
        deleteCourse(course.id, course.name);
    });

    courseList.appendChild(card);
};

const addCourse = async () => {
    const courseName = courseNameInput.value.trim();
    if (!courseName) {
        alert('과목명을 입력해주세요.');
        return;
    }
    
    const initialProgress = Array(15).fill(null).map(() => ({
        status: STATUS.NOT_STARTED,
        completedDate: null
    }));
    
    const newCourse = {
        name: courseName,
        progress: initialProgress,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('courses').add(newCourse);
        loadCourses();
        courseNameInput.value = '';
    } catch (error) {
        console.error("Error adding course: ", error);
        alert("과목 추가에 실패했습니다.");
    }
};

const updateStatus = async (courseId, weekIndex, newStatus) => {
    try {
        const courseRef = db.collection('courses').doc(courseId);
        const doc = await courseRef.get();
        if (doc.exists) {
            const progress = doc.data().progress;
            
            // 기존 데이터가 숫자 형식일 경우 객체로 변환
            if(typeof progress[weekIndex] !== 'object' || progress[weekIndex] === null) {
                progress[weekIndex] = { status: 0, completedDate: null };
            }

            progress[weekIndex].status = newStatus;
            
            if (newStatus === STATUS.COMPLETED) {
                // 날짜가 없을 때만 오늘 날짜로 새로 기록
                if (!progress[weekIndex].completedDate) {
                    progress[weekIndex].completedDate = getFormattedDate();
                }
            } else {
                progress[weekIndex].completedDate = null;
            }
            
            await courseRef.update({ progress });
        }
    } catch (error) {
        console.error("Error updating status: ", error);
        alert("상태 업데이트에 실패했습니다.");
    }
};

// === 신규 함수: 날짜만 독립적으로 업데이트 ===
const updateCompletionDate = async (courseId, weekIndex, newDate) => {
    try {
        const courseRef = db.collection('courses').doc(courseId);
        const doc = await courseRef.get();
        if (doc.exists) {
            const progress = doc.data().progress;
            if (progress[weekIndex]) {
                progress[weekIndex].completedDate = newDate;
                await courseRef.update({ progress });
            }
        }
    } catch (error) {
        console.error("Error updating date: ", error);
        alert("날짜 업데이트에 실패했습니다.");
    }
};

const deleteCourse = async (courseId, courseName) => {
    if (confirm(`'${courseName}' 과목을 정말 삭제하시겠습니까?`)) {
        try {
            await db.collection('courses').doc(courseId).delete();
            const cardToRemove = document.querySelector(`.course-card[data-id="${courseId}"]`);
            if(cardToRemove) {
                cardToRemove.remove();
            }
        } catch (error) {
            console.error("Error deleting course: ", error);
            alert("과목 삭제에 실패했습니다.");
        }
    }
};

addCourseBtn.addEventListener('click', addCourse);
courseNameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        addCourse();
    }
});

window.addEventListener('DOMContentLoaded', loadCourses);