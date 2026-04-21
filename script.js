let books = [];
let editIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Library System Online.");

    const savedBooks = localStorage.getItem('myLibraryData');
    if (savedBooks) {
        books = JSON.parse(savedBooks);
        renderTable(books);
    } else {
        fetch('books.json')
            .then(res => res.json())
            .then(data => {
                books = data;
                renderTable(books);
                saveToLocalStorage();
            })
            .catch(err => console.log("Starting with empty library."));
    }

    const lookupBtn = document.getElementById('lookupBtn');
    lookupBtn.addEventListener('click', () => {
        const isbn = document.getElementById('isbn').value.replace(/[- ]/g, "").trim();
        if (!isbn) return alert("Please enter an ISBN first.");

        console.log("Searching for ISBN:", isbn);
        const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                const bookKey = `ISBN:${isbn}`;
                if (data[bookKey]) {
                    const info = data[bookKey];
                    document.getElementById('title').value = info.title || "";
                    document.getElementById('author').value = info.authors ? info.authors[0].name : "Unknown Author";
                    console.log("Book details auto-filled.");
                } else {
                    alert("Book not found in Open Library database.");
                }
            })
            .catch(err => alert("API Error. Check your internet connection."));
    });

    const form = document.getElementById('bookForm');
    const addBtn = document.getElementById('addBtn');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        

        const bookData = {
    title: document.getElementById('title').value,
    author: document.getElementById('author').value,
    isbn: document.getElementById('isbn').value,
    shelf: document.getElementById('shelf').value,
    formFactor: document.getElementById('formFactor').value,
    date: document.getElementById('date').value,
    genre: document.getElementById('genre').value, 
    borrower: document.getElementById('borrower').value 
};
        if (editIndex !== null) {
          
            books[editIndex] = bookData;
            editIndex = null;
            addBtn.textContent = "Add to Library List";
            addBtn.style.background = "#b4dbf5";
        } else {
            
            books.push(bookData);
        }

        saveToLocalStorage();
        renderTable(books);
        form.reset();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = books.filter(b => 
            b.title.toLowerCase().includes(term) || 
            b.author.toLowerCase().includes(term) ||
            b.shelf.toLowerCase().includes(term)
        );
        renderTable(filtered);
    
    });

let html5QrCode;

document.getElementById('startScanBtn').addEventListener('click', () => {
    const readerDiv = document.getElementById('reader');
    readerDiv.style.display = 'block';

    // 1. Get all available cameras first
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length > 0) {
            // 2. Try to find the back camera specifically
            let backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
            
            // 3. Fallback to the first camera if 'back' isn't labeled clearly
            let cameraId = backCamera ? backCamera.id : cameras[0].id;

            const html5QrCode = new Html5Qrcode("reader");
            
            html5QrCode.start(
                cameraId, 
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.0 // Helps mobile focus
                },
                (decodedText) => {
                    document.getElementById('isbn').value = decodedText;
                    html5QrCode.stop().then(() => {
                        readerDiv.style.display = 'none';
                        document.getElementById('lookupBtn').click();
                    });
                }
            ).catch(err => {
                console.error("Camera Start Error:", err);
                alert("Mobile Error: " + err);
            });
        } else {
            alert("No cameras found on this device.");
        }
    }).catch(err => {
        alert("Camera Access Error: " + err);
    });
});
});


function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    data.forEach((book, index) => {
        const coverUrl = book.isbn 
            ? `https://covers.openlibrary.org/b/isbn/${book.isbn.trim()}-M.jpg?default=false` 
            : 'https://via.placeholder.com/50x75?text=No+Cover';

        const isLent = book.borrower && book.borrower.trim() !== "";
        const statusClass = isLent ? 'status-lent' : 'status-available';
        const statusText = isLent ? `Lent to: ${book.borrower}` : 'Available';

        tbody.innerHTML += `
            <tr>
                <td><img src="${coverUrl}" class="book-cover" onerror="this.src='https://via.placeholder.com/50x75?text=N/A'"></td>
                <td><strong>${book.title}</strong></td>
                <td>${book.author}</td>
                <td>${book.genre || 'General'}</td>
                <td>${book.isbn}</td>
                <td><span class="shelf-label">${book.shelf}</span></td>
                <td>${book.date}</td>
                <td>${book.formFactor}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-edit" onclick="editBook(${index})">Edit</button>
                    <button class="btn-toggle" onclick="quickToggleLent(${index})">
                        ${isLent ? 'Return' : 'Lend'}
                    </button>
                    <button class="btn-delete" onclick="deleteBook(${index})">Delete</button>
                </td>
            </tr>`;
            updateStats();
    });
}
function saveToLocalStorage() {
    localStorage.setItem('myLibraryData', JSON.stringify(books));
}

function deleteBook(index) {
    if (confirm("Delete this book from the catalogue?")) {
        books.splice(index, 1);
        saveToLocalStorage();
        renderTable(books);
    }
}

function editBook(index) {
    const book = books[index];
    
    document.getElementById('title').value = book.title;
    document.getElementById('author').value = book.author;
    document.getElementById('isbn').value = book.isbn;
    document.getElementById('shelf').value = book.shelf;
    document.getElementById('date').value = book.date;
    document.getElementById('formFactor').value = book.formFactor;

    editIndex = index;

    const addBtn = document.getElementById('addBtn');
    addBtn.textContent = "Update Book Details";
    addBtn.style.background = "#b4dbf5";
    
    window.scrollTo(0, 0);
}
document.getElementById('exportBtn').addEventListener('click', () => {
    if (books.length === 0) return alert("Your library is empty!");

    const dataStr = JSON.stringify(books, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'my_library_backup.json';
    link.click();
    URL.revokeObjectURL(url);
});
document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedBooks = JSON.parse(event.target.result);
            
            if (confirm(`Found ${importedBooks.length} books. Overwrite current library?`)) {
                books = importedBooks;
                saveToLocalStorage();
                renderTable(books);
                alert("Library restored successfully!");
            }
        } catch (err) {
            alert("Error: This file doesn't look like a valid library backup.");
        }
    };
    reader.readAsText(file);
});
function quickToggleLent(index) {
    const book = books[index];
    const currentlyLent = book.borrower && book.borrower.trim() !== "";

    if (currentlyLent) {

        book.borrower = "";
    } else {
    
        const name = prompt("Who is borrowing this book?");
        if (name) book.borrower = name;
    }

    saveToLocalStorage();
    renderTable(books);
}
function updateStats() {

    document.getElementById('totalCount').textContent = books.length;
    const lent = books.filter(b => b.borrower && b.borrower.trim() !== "").length;
    document.getElementById('lentCount').textContent = lent;
    const genres = new Set(books.map(b => b.genre || 'General'));
    document.getElementById('genreCount').textContent = genres.size;
}
