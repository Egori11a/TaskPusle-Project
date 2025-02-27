const formElement = document.querySelector('form');
const inputElement = document.getElementById('todo-input');
const listElement = document.getElementById('todo-list');
const errorMessage = document.getElementById('error-message');
const checkboxforDeadline = document.getElementById('selTime');
const dateInputElement = document.getElementById('date-input');
const checkAllBtn = document.querySelector('.check-all-btn');
const removeCheckedBtn = document.querySelector('.remove-checked-btn');

const URL_data = 'http://localhost:3000/posts';

const taskIntervals = {};
let allTodos = [];
loadTodos().then(todos => {
    allTodos = todos;
    renderTodoList();
});

requestNotificationPermission();
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

formElement.addEventListener('submit', (e) => {
    e.preventDefault();

    if(checkboxforDeadline.checked) {
        addTask(inputElement.value, dateInputElement.value);
    } else {
        addTask(inputElement.value);
    }

});

const showErrorMessage = (message) => {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
};

const hideErrorMessage = () => {
    errorMessage.style.display = 'none';
};

async function addTask(taskName, taskDate = null) {
    if (!taskName.trim()) {
        showErrorMessage('Пустой задачи не бывает!');
        return;
    }

    if(taskDate && new Date(taskDate) < new Date()) {
        showErrorMessage('Дедлайн не может быть в прошлом!');
        return;
    }

    hideErrorMessage();

    checkboxforDeadline.checked = false;
    dateInputElement.value = "1990-01-01T00:00";

    const newTodo = {
        text: taskName,
        completed: false,
        deadline: taskDate,
        notified: false
    };

    try {
        const response = await fetch(URL_data, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTodo)
        });
        allTodos.push(newTodo);
        if(!response.ok) throw new Error('Ошибка добавления');
    } catch (error) {
        console.error(error);
    }

    const newTaskElement = createTaskElement(newTodo, allTodos.length - 1);
    listElement.append(newTaskElement);

    inputElement.value = '';
}

function renderTodoList() {
    listElement.innerHTML = "";
    allTodos.forEach((todo, index) => {
        listElement.append(createTaskElement(todo, index));
    });
}

checkAllBtn.addEventListener('click', () => checkAllItems());

async function checkAllItems() {
    const allChecked = allTodos.every(todo => todo.completed);

    allTodos.forEach(todo => todo.completed = !allChecked);

    try {
        await Promise.all(allTodos.map(todo => 
            fetch(`${URL_data}/${todo.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: todo.completed })
            })
        ));

        const checkboxes = listElement.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = allTodos[index].completed;
            checkbox.closest('.todo').classList.toggle('completed', allTodos[index].completed);
        });

    } catch (error) {
        console.error('Ошибка обновления задач:', error);
    }
};

removeCheckedBtn.addEventListener('click', () => deleteAllSelected());

async function deleteAllSelected() {
    if (!allTodos.some(todo => todo.completed)) return;

    try {
        await Promise.all(allTodos.map(todo => 
            fetch(`${URL_data}/${todo.id}`, {
                method: 'DELETE'
            })
        ));
        allTodos = allTodos.filter(todo => !todo.completed);

    } catch (error) {
        console.error('Ошибка обновления задач:', error);
    }

    renderTodoList();
}

function createTaskElement(todo, index) {
    const todoId = `todo-${index}`;
    const newListElement = document.createElement('li');
    newListElement.className = 'todo';

    if (todo.completed) {
        newListElement.classList.add('completed');
    }

    const deadlineStyle = todo.deadline ? 'display: block' : 'display: none';
    
    newListElement.innerHTML = `
        <input type="checkbox" id="${todoId}">
        <label class="custom-checkbox" for="${todoId}">
            <svg fill="transparent" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
            </svg>
        </label>
        <label for="${todoId}" class="todo-text">${todo.text}</label>
        <button class="edit-button">
            <svg fill="var(--secondary-color)" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
        </button>
        <button class="delete-button">
            <svg fill="var(--secondary-color)" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
            </svg>
        </button>
    `;

    if (todo.deadline) {
        newListElement.classList.add('has-banner');
        const banner = document.createElement('div');
        banner.className = 'todo-banner';
        banner.style = deadlineStyle;
        banner.innerHTML = `Deadline: ${todo.deadline}`;
        newListElement.appendChild(banner);

        setTimeout(() => updateTimer(index), 0);
        if (Object.keys(taskIntervals).length === 0) {
            taskIntervals.all = setInterval(updateAllTimers, 1000);
        }
    }

    const editButton = newListElement.querySelector('.edit-button');
    editButton.addEventListener('click', () => {
        if(!todo.completed){
            const saveButton = replaceButton(editButton, newListElement);
            editTask(index, newListElement, saveButton);
        }
    });

    const deleteButton = newListElement.querySelector('.delete-button');
    deleteButton.addEventListener('click', () => removeTask(index));

    const checkbox = newListElement.querySelector('input');
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', async () => {
        allTodos[index].completed = checkbox.checked;
        newListElement.classList.toggle('completed', checkbox.checked);

        try {
            await fetch(`${URL_data}/${todo.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({completed: checkbox.checked})
            });
        } catch (error) {
            console.error(error);
        }
    });

    return newListElement;
}

function updateAllTimers() {
    allTodos.forEach((_, index) => updateTimer(index));
}

function updateTimer(index) {
    const todo = allTodos[index];
    if (!todo || !todo.deadline) return;

    const todoItem = document.querySelector(`#todo-${index}`).closest('.todo');
    if (!todoItem) return;

    const banner = todoItem.querySelector('.todo-banner');
    if (!banner) return;

    const deadlineDate = new Date(todo.deadline);
    const now = new Date();
    const timeLeft = deadlineDate - now;

    const date = deadlineDate.toLocaleDateString();
    const time = deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (timeLeft <= 0) {
        banner.innerHTML = 'Deadline has passed';
        clearInterval(taskIntervals[index]);
        delete taskIntervals[index];
    } else {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        let timeLeftString = `Deadline: ${date} in ${time} Time left: `;

        if (days > 0) timeLeftString += `${days}d `;
        if (days > 0 || hours > 0) timeLeftString += `${hours}h `;
        if (days > 0 || hours > 0 || minutes > 0) timeLeftString += `${minutes}m `;
        timeLeftString += `${seconds}s`;

        banner.innerHTML = timeLeftString;

        if (Notification.permission === 'granted') {
            if(hours<=0 && minutes%15==0 && seconds==0 && !todo.notified) {
                sendNotification(`Срок выполнения задачи "${todo.text}" истекает! Осталось ${minutes} минут!`);
                todo.notified = true;
                
                fetch(`${URL_data}/${todo.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notified: true })
                }).catch(error => console.error('Ошибка обновления notified:', error));
            }
            if(todo.notified) todo.notified = false;
        }
    } 
}

function sendNotification(message) {
    new Notification('Напоминание', {
        body: message,
        icon: 'icon.png'
    });
}


function replaceButton(editButton, currListElement) {
    editButton.style.display = 'none';

    const saveButton = document.createElement('button');
    saveButton.classList.add('save-button');
    saveButton.innerHTML = `
        <svg fill="var(--secondary-color)" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
            <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
        </svg>
    `;

    currListElement.insertBefore(saveButton, editButton.nextSibling);

    return saveButton;
}

function restoreButton(editButton, saveButton, input, textLabel) {
    saveButton.remove();
    editButton.style.display = '';

    textLabel.textContent = input.value;
    textLabel.style.display = '';
    input.remove(); 
}

async function editTask(index, taskElement, saveButton) {
    const todo = allTodos[index];

    const input = document.createElement('input');
    input.type = 'text';
    input.value = todo.text;
    input.id = 'todo-input';
    input.autocomplete = 'off';

    const textLabel = taskElement.querySelector('.todo-text');
    textLabel.style.display = 'none';

    taskElement.insertBefore(input, textLabel);
    input.focus();

    saveButton.replaceWith(saveButton.cloneNode(true));
    saveButton = taskElement.querySelector('.save-button');

    saveButton.addEventListener('click', async () => {
        todo.text = input.value;
        
        try {
            await fetch(`${URL_data}/${todo.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({text: todo.text})
            });

            restoreButton(taskElement.querySelector('.edit-button'), saveButton, input, textLabel);
        } catch (error) {
            console.error(error);
        }

    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveButton.click();
        }
    });
}

async function removeTask(todoIndex) {
    if (taskIntervals[todoIndex]) {
        clearInterval(taskIntervals[todoIndex]);
        delete taskIntervals[todoIndex];
    }

    const todo = allTodos[todoIndex];

    try {
        await fetch(`${URL_data}/${todo.id}`, {
            method: 'DELETE'
        });
        allTodos = allTodos.filter((_, i) => i !== todoIndex);
        renderTodoList();
    } catch (error) {
        console.error(error)
    }
}

async function loadTodos () {
    try {
        const response = await fetch(URL_data);
        if(!response.ok) throw new Error('Ошибка загрузки данных :(');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
}