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

// 전역변수
let currentMonth = new Date();
let allCoursesData = [];

// DOM 요소 가져오기
const courseNameInput = document.getElementById('course-name-input');
const addCourseBtn = document.getElementById('add-course-btn');
const courseList = document.getElementById('course-list');
const courseCardTemplate = document.getElementById('course-card-template');

const calendarGrid = document.getElementById('calendar-grid');
const monthYearTitle = document.getElementById('month-year-title');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');



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


// 캘린더 렌더링
const renderCalendar = () => {
    calendarGrid.innerHTML = '';
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    monthYearTitle.textContent = `${year}년 ${month + 1}월`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const eventsMap = processEventsForCalendar();

    // 요일 헤더 추가
    ['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
        const dayNameCell = document.createElement('div');
        dayNameCell.className = 'day-name';
        dayNameCell.textContent = day;
        calendarGrid.appendChild(dayNameCell);
    });

    for (let i = 0; i < firstDay; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    for (let date = 1; date <= lastDate; date++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';

        const dateNumber = document.createElement('div');
        dateNumber.className = 'date-number';
        dateNumber.textContent = date;
        dayCell.appendChild(dateNumber);

        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && date === today.getDate()) {
            dayCell.classList.add('is-today');
        }

        const fullDateStr = getFormattedDate(new Date(year, month, date));
        if (eventsMap[fullDateStr]) {
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'calendar-events';
            eventsMap[fullDateStr].forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = `calendar-event ${event.type === 'completed' ? 'event-completed' : 'event-in-progress'}`;
                
                // === 오타를 수정한 최종 코드입니다. ===
                eventEl.textContent = event.text;
                // ===================================
                
                eventsContainer.appendChild(eventEl);
            });
            dayCell.appendChild(eventsContainer);
        } else {
            dayCell.classList.add('no-events');
        }

        calendarGrid.appendChild(dayCell);
    }
}


// 캘린더 이벤트 가공 함수
const processEventsForCalendar = () => {
    const eventsMap = {}; // 변수명 eventsMap (대문자 M)
    allCoursesData.forEach(course => {
        course.progress.forEach((week, index) => {
            if (week.status === STATUS.COMPLETED && week.completedDate) {
                const date = week.completedDate;
                if (!eventsMap[date]) eventsMap[date] = [];
                eventsMap[date].push({ type: 'completed', text: `${course.name}-${index + 1}강 완료` });
            } else if (week.status === STATUS.IN_PROGRESS && week.inProgressDate) {
                const date = week.inProgressDate;
                // 아래 두 줄의 eventsmap -> eventsMap 으로 수정했습니다.
                if (!eventsMap[date]) eventsMap[date] = [];
                eventsMap[date].push({ type: 'in-progress', text: `${course.name}-${index + 1}강 수강중` });
            }
        });
    });
    return eventsMap;
};


const loadCourses = async () => {
    courseList.innerHTML = '';
    allCoursesData=[]; //데이터 초기화
    try {
        const snapshot = await db.collection('courses').orderBy('createdAt', 'desc').get();
        snapshot.forEach(doc => {
            const course = doc.data();
            course.id = doc.id;
            allCoursesData.push(course); // 전역 데이터에 저장
            renderCourseCard(course);
        });
        renderCalendar();
    } catch (error) {
        console.error("Error loading courses: ", error);
        alert("데이터를 불러오는 데 실패했습니다.");
    }
};


/* // 과목 카드 하나를 화면에 그리는 함수 (대폭 수정됨)
const renderCourseCard = (course) => {
    const card = courseCardTemplate.content.cloneNode(true);
    const courseCardElement = card.querySelector('.course-card');
    courseCardElement.dataset.id = course.id;
    card.querySelector('.course-title').textContent = course.name;

    const progressGrid = card.querySelector('.progress-grid');
    progressGrid.innerHTML='';
    for (let i = 0; i < 15; i++) {
        const week = i + 1;

        let weekData = course.progress[i];
        if (typeof weekData !== 'object' || weekData === null) {
            weekData = { status: STATUS.NOT_STARTED, completedDate: null };
        }

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
            if (parseInt(key) === status) option.selected = true;
            select.appendChild(option);
        }
        select.classList.add(STATUS_INFO[status].class);

        const dateElement = document.createElement('div');
        dateElement.className = 'completion-date';
        if (completedDate) {
            dateElement.textContent = completedDate;
        }

        // ✅ 항상 이벤트 등록 (주차 상관없이 동작)
        dateElement.addEventListener('click', () => {
            if (select.value != STATUS.COMPLETED) return; // '수강 완료'일 때만 변경 가능

            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.className = 'date-input';
            dateInput.value = dateElement.textContent || getFormattedDate();

            weekItem.replaceChild(dateInput, dateElement);
            dateInput.focus();

            const saveDate = () => {
                const newDate = dateInput.value;
                dateElement.textContent = newDate;
                weekItem.replaceChild(dateElement, dateInput);
                updateCompletionDate(course.id, i, newDate);
            };

            dateInput.addEventListener('blur', saveDate);
            dateInput.addEventListener('change', saveDate);
        });

        select.addEventListener('change', async (e) => {
            const newStatus = parseInt(e.target.value);
            await updateStatus(course.id, i, newStatus);

            select.className = 'status-select';
            select.classList.add(STATUS_INFO[newStatus].class);

            if (newStatus === STATUS.COMPLETED) {
                const newDate = getFormattedDate();
                dateElement.textContent = newDate;
                updateCompletionDate(course.id, i, newDate);
            } else {
                dateElement.textContent = '';
                updateCompletionDate(course.id, i, null);
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
}; */


const addCourse = async () => {
    const courseName = courseNameInput.value.trim();
    if (!courseName) {
        alert('과목명을 입력해주세요.');
        return;
    }
    
    const initialProgress = Array(15).fill(null).map(() => ({
        status: STATUS.NOT_STARTED,
        completedDate: null,
        inProgressDate:null
    }));
    
    const newCourse = {
        name: courseName,
        progress: initialProgress,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        
        loadCourses();
        courseNameInput.value = '';
        
        const docRef = await db.collection('courses').add(newCourse);
        const newCourseData = { ...newCourse, id:docRef.id};
        allCoursesData.unshift(newCourseData); // 전역 데이터에 추가
        renderCourseCard(newCourseData);
        renderCalendar(); // 캘린더 업데이트
        courseNameInput.value='';
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
                progress[weekIndex] = { status: 0, completedDate: null, inProgressDate:null };
            }

            progress[weekIndex].status = newStatus;
            
            if (newStatus === STATUS.COMPLETED) {
                progress[weekIndex].inProgressDate = null; //수강중 날짜 제거
                // 날짜가 없을 때만 오늘 날짜로 새로 기록
                if (!progress[weekIndex].completedDate) {
                    progress[weekIndex].completedDate = getFormattedDate();
                }
            } else if(newStatus === STATUS.IN_PROGRESS){
                progress[weekIndex].inProgressDate = getFormattedDate(); // 수강중 날짜 기록
                progress[weekIndex].completedDate = null;
            } else {
                progress[weekIndex].completedDate = null;
                progress[weekIndex].inProgressDate = null;
            }
            
            await courseRef.update({ progress });

            // 전역 데이터 업데이트 및 렌더링
            const courseIndex = allCoursesData.findIndex(c => c.id === courseId);
            if(courseIndex > -1) allCoursesData[courseIndex].progress = progress;
            renderCalendar();
        }
    } catch (error) {
        console.error("Error updating status: ", error);
        alert("상태 업데이트에 실패했습니다.");
    }
};

// === 신규 함수: 날짜만 독립적으로 업데이트 ===
// === 날짜만 독립적으로 업데이트 (수정된 버전) ===
const updateCompletionDate = async (courseId, weekIndex, newDate) => {
    try {
        const courseRef = db.collection('courses').doc(courseId);
        const doc = await courseRef.get();
        if (doc.exists) {
            const progress = doc.data().progress;
            if (progress[weekIndex]) {
                progress[weekIndex].completedDate = newDate;
                await courseRef.update({ progress });

                // 전역 데이터 업데이트 및 리렌더링 로직을 try 블록 안으로 이동
                const courseIndex = allCoursesData.findIndex(c => c.id === courseId);
                if (courseIndex > -1) {
                    allCoursesData[courseIndex].progress = progress;
                }
                renderCalendar(); // 캘린더 즉시 업데이트
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
            allCoursesData = allCoursesData.filter(c=>c.id !== courseId); // 전역 데이터에서 제거
            const cardToRemove = document.querySelector(`.course-card[data-id="${courseId}"]`);
            if(cardToRemove) {
                cardToRemove.remove();
            }
            renderCalendar(); // 캘린더 업데이트
        } catch (error) {
            console.error("Error deleting course: ", error);
            alert("과목 삭제에 실패했습니다.");
        }
    }
};

// 캘린더 월 이동 버튼 이벤트 리스너
prevMonthBtn.addEventListener('click', ()=>{
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
})

nextMonthBtn.addEventListener('click', ()=>{
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
})

addCourseBtn.addEventListener('click', addCourse);
courseNameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        addCourse();
    }
});


function renderCourseCard(course){

    // 과목 카드 하나를 화면에 그리는 함수 (대폭 수정됨)
    const card = courseCardTemplate.content.cloneNode(true);
    const courseCardElement = card.querySelector('.course-card');
    courseCardElement.dataset.id = course.id;
    card.querySelector('.course-title').textContent = course.name;

    const progressGrid = card.querySelector('.progress-grid');
    progressGrid.innerHTML='';
    for (let i = 0; i < 15; i++) {
        const week = i + 1;

        let weekData = course.progress[i];
        if (typeof weekData !== 'object' || weekData === null) {
            weekData = { status: STATUS.NOT_STARTED, completedDate: null };
        }

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
            if (parseInt(key) === status) option.selected = true;
            select.appendChild(option);
        }
        select.classList.add(STATUS_INFO[status].class);

        const dateElement = document.createElement('div');
        dateElement.className = 'completion-date';
        if (completedDate) {
            dateElement.textContent = completedDate;
        }

        // ✅ 항상 이벤트 등록 (주차 상관없이 동작)
        dateElement.addEventListener('click', () => {
            if (select.value != STATUS.COMPLETED) return; // '수강 완료'일 때만 변경 가능

            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.className = 'date-input';
            dateInput.value = dateElement.textContent || getFormattedDate();

            weekItem.replaceChild(dateInput, dateElement);
            dateInput.focus();

            const saveDate = () => {
                const newDate = dateInput.value;
                dateElement.textContent = newDate;
                weekItem.replaceChild(dateElement, dateInput);
                updateCompletionDate(course.id, i, newDate);
            };

            dateInput.addEventListener('blur', saveDate);
            dateInput.addEventListener('change', saveDate);
        });

        select.addEventListener('change', async (e) => {
            const newStatus = parseInt(e.target.value);
            await updateStatus(course.id, i, newStatus);

            select.className = 'status-select';
            select.classList.add(STATUS_INFO[newStatus].class);

            if (newStatus === STATUS.COMPLETED) {
                const newDate = getFormattedDate();
                dateElement.textContent = newDate;
                updateCompletionDate(course.id, i, newDate);
            } else {
                dateElement.textContent = '';
                updateCompletionDate(course.id, i, null);
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
}

addCourseBtn.addEventListener('click', addCourse);
courseNameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') addCourse();
})


window.addEventListener('DOMContentLoaded', loadCourses);