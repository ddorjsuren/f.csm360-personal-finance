import {supabase} from "./supabase.js"

const transactionForm = document.getElementById('transaction-form');
const txTypeInput = document.getElementById('tx-type');
const txCategoryInput = document.getElementById('tx-category');
const txAmountInput = document.getElementById('tx-amount');
const txDateInput = document.getElementById('tx-date');
const txDescInput = document.getElementById('tx-desc');

// Хуудас бэлэн болж, ачаалагдаж дуусах үед ажиллах хэсэг
document.addEventListener('DOMContentLoaded', async () => {
    
    // Хамгийн түрүүнд хэрэглэгч нэвтэрсэн эсэхийг шалгана
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        // Хэрэв нэвтрээгүй байвал шууд нэвтрэх хуудас руу буцаана
        window.location.href = 'index.html';
        return;
    }

    // Хэрэглэгч нэвтэрсэн нь үнэн бол имэйлийг нь navbar дээр харуулна
    document.getElementById('user-email').textContent = user.email;

    await fetchTransactions(); 
    await fetchBudgets();
});

transactionForm.addEventListener('submit', async(e)=>{
    e.preventDefault();

    const type = txTypeInput.value;
    const category = txCategoryInput.value;
    const amount = parseFloat(txAmountInput.value);
    const date = txDateInput.value;
    const description = txDescInput.value;

    const{data:{user}, error: userError} = await supabase.auth.getUser();
    if(userError || !user){
        alert("Сешн дууссан байна.")
        window.location.href = "index.html"
        return;
    }
     // Хэрэв хийж буй гүйлгээ нь ЗАРЛАГА бол ТӨСӨВ ХЭТЭРСЭН ЭСЭХИЙГ ШАЛГАНА
    if (type === 'expense') {
        // Тухайн гүйлгээний огнооноос Жил-Сарыг салгаж авна (Жишээ нь: "2026-06-08" -> "2026-06")
        const currentMonthYear = date.substring(0, 7);
        console.log("The dates checked: "+currentMonthYear);
        // Supabase-ээс энэ сард, энэ ангилалд тогтоосон төсөв байгаа эсэхийг хайх
        const { data: budgetData } = await supabase
            .from('budgets')
            .select('limit_amount')
            .eq('user_id', user.id)
            .eq('category', category)
            .eq('month_year', currentMonthYear)
            .maybeSingle(); // Олдвол ганцхан объект авна, олдохгүй бол null
        console.log("Has the budget been found? : "+ budgetData);
        // Хэрэв энэ сард энэ ангилалд зориулсан төсөв олдвол цааш шалгана
        if (budgetData) {
            const limitAmount = budgetData.limit_amount;

            // Энэ сард, энэ ангилалд урьд нь хийгдсэн бүх зарлагуудын нийлбэрийг Supabase-с татах
            const { data: pastExpenses } = await supabase
                .from('transaction')
                .select('amount, date')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .eq('category', category);
            console.log("retrieved expenses: "+  pastExpenses);
            // Энэ сард хамаарах зарлагуудыг шүүж нийлбэрийг олно
            let totalPastExpense = 0;
            if (pastExpenses) {
                pastExpenses.forEach(tx => {
                    // Гүйлгээ бүрийн огноо нь энэ сард хамааралтай эсэхийг шалгах
                    if (tx.date && tx.date.substring(0, 7) === currentMonthYear) {
                        totalPastExpense += tx.amount;
                    }
                });
            }
            console.log("Past vs Current: "+totalPastExpense +" vs "+limitAmount + "vs" + amount);
            // Хуучин зарлагууд дэар ОДООНЫ ШИНЭ зарлагын дүнг нэмээд лимитээс давж байгааг шалгах
            if (totalPastExpense + amount > limitAmount) {
                const currentTotal = totalPastExpense + amount;
                // Хэрэглэгчээс зөвшөөрөл авна
                const proceed = confirm(
                    `АНХААРУУЛГА!\n\nТаны ${currentMonthYear} сарын "${category}" ангиллын төсвийн хязгаар: ${limitAmount.toLocaleString()} ₮\nОдоогийн нийт зарцуулалт: ${currentTotal.toLocaleString()} ₮ болох гэж байна.\n\nТөсөв хэтрүүлж гүйлгээг үргэлжлүүлэх үү?`
                );
                
                if (!proceed) {
                    return; // Хэрэв хэрэглэгч "Цуцлах" дээр дарвал гүйлгээг хадгалахгүй зогсооно!
                }
            }
        }
    }
    
    const{data,error} = await supabase.from('transaction').insert([{
        user_id:user.id,
        type: type,
        category:category,
        amount:amount,
        description:description,
        date:date
    }
    ]).select();
    if(error){
        alert("Гүйлгээг хадгалахад алдаа гарлаа: "+error.message);
        console.error("Дэлгэрэнгүй: ",error);
    } else{
        alert("Гүйлгээ Амжилттай бүртгэгдлээ!");
        transactionForm.reset();
    }
    fetchTransactions();

});
async function fetchTransactions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: transactions, error } = await supabase
        .from('transaction')
        .select('*') 
        .eq('user_id', user.id) 
        .order('date', { ascending: false }); 

    if (error) {
        console.error("Гүйлгээ уншихад алдаа гарлаа:", error.message);
        return;
    }
    // Мөнгөн дүнг тооцоолох хэсэг
    let totalIncome = 0;
    let totalExpense = 0;

    // Ирсэн бүх гүйлгээнүүдийг нэг нэгээр нь шалгаж, орлого зарлагыг нэмнэ
    transactions.forEach(tx => {
        if (tx.type === 'income') {
            totalIncome += tx.amount;  // Хэрэв орлого бол Нийт Орлого дээр нэмнэ
        } else if (tx.type === 'expense') {
            totalExpense += tx.amount; // Хэрэв зарлага бол Нийт зарлага дээр нэмнэ
        }
    });

    // Үлдэгдэл баланс = Нийт Орлого - Нийт Зарлага
    const totalBalance = totalIncome - totalExpense;

    // Бодсон дүнг HTML карт руу бичих
    document.getElementById('total-balance').textContent = `${totalBalance.toLocaleString()} ₮`;
    document.getElementById('total-income').textContent = `${totalIncome.toLocaleString()} ₮`;
    document.getElementById('total-expense').textContent = `${totalExpense.toLocaleString()} ₮`;
    renderTransactions(transactions);

    // Шинэчлэгдсэн гүйлгээний жагсаалтаар тэмдэгүүдийг шалгаж олгоно
    await checkAndAwardBadges(transactions, user, totalBalance);
}

function renderTransactions(transactions) {
    const listContainer = document.getElementById('transaction-list');
    
    if (transactions.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fa-solid fa-folder-open fs-3 d-block mb-2"></i>
                    Одоогоор ямар нэгэн гүйлгээ бүртгэгдээгүй байна.
                </td>
            </tr>
        `;
        return;
    }
    let htmlContent = '';
    
    transactions.forEach(tx => {
        const isIncome = tx.type === 'income';
        const badgeColor = isIncome ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
        const typeText = isIncome ? 'Орлого' : 'Зарлага';
        const amountSign = isIncome ? '+' : '-';
        const amountColor = isIncome ? 'text-success' : 'text-danger';

        htmlContent += `
            <tr>
                <td>${tx.date}</td>
                <td><span class="badge bg-light text-dark shadow-sm border">${tx.category}</span></td>
                <td class="text-secondary fw-medium">${tx.description}</td>
                <td><span class="badge ${badgeColor}">${typeText}</span></td>
                <td class="text-end fw-bold ${amountColor}">${amountSign}${tx.amount.toLocaleString()} ₮</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteTransaction('${tx.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    listContainer.innerHTML = htmlContent;
}

window.deleteTransaction = async function(id) {
    // Хэрэглэгчээс үнэхээр устгах эсэхийг нь лавлаж асууна
    const confirmDelete = confirm("Та энэ гүйлгээг устгахдаа итгэлтэй байна уу?");
    
    if (!confirmDelete) {
        return; // Хэрэв "Үгүй" гэвэл устгах үйлдлийг цуцалж, функцээс гарна
    }

    try {
        // Supabase өгөгдлийн сангаас тухайн ID-тай гүйлгээг устгах
        const { error } = await supabase
            .from('transaction')
            .delete() // SQL-ийн DELETE команд
            .eq('id', id); // Зөвхөн энэ ID-тай мөрийг устга гэдэг шүүлтүүр

        if (error) {
            throw error; // Хэрэв алдаа гарвал catch хэсэг рүү шиднэ
        }

        alert("Гүйлгээ амжилттай устгагдлаа.");

        // Устгасны дараа дэлгэц дээрх хүснэгтийг шууд шинэчилж харуулна
        fetchTransactions();

    } catch (error) {
        alert("Гүйлгээ устгахад алдаа гарлаа: " + error.message);
        console.error("Устгах үеийн алдаа:", error);
    }
}

// HTML дээрх "Гарах" товч ID-аар нь барьж авах
const btnLogout = document.getElementById('btn-logout');

// Товч дээр дарах үед ажиллах Event Listener залгах
btnLogout.addEventListener('click', async () => {
    // Хэрэглэгчээс үнэхээр гарах эсэхийг нь лавлаж асууна
    const confirmLogout = confirm("Та системээс гарахдаа итгэлтэй байна уу?");
    
    if (!confirmLogout) {
        return; // Хэрэв цуцалбал гарах үйлдлийг зогсооно
    }

    try {
        // Supabase-ийн системээс бүрмөсөн гаргах, сешн устгах тушаал
        const { error } = await supabase.auth.signOut();

        if (error) {
            throw error; // Хэрэв алдаа гарвал catch хэсэг рүү шиднэ
        }

        // Амжилттай гарсан тул нэвтрэх хуудас руу шууд шилжүүлнэ
        window.location.href = 'index.html';

    } catch (error) {
        alert("Системээс гарахад алдаа гарлаа: " + error.message);
        console.error("Logout алдаа:", error);
    }
});


// --- ТӨСӨВ ТОГТООХ ФОРМЫН ЛОГИК ---
const budgetForm = document.getElementById('budget-form');
const budgetCategoryInput = document.getElementById('budget-category');
const budgetAmountInput = document.getElementById('budget-amount');
const budgetMonthInput = document.getElementById('budget-month');

budgetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Формоос өгөгдөл уншиж авах
    const category = budgetCategoryInput.value;
    const limitAmount = parseFloat(budgetAmountInput.value);
    const monthYear = budgetMonthInput.value; 
    // Нэвтэрсэн хэрэглэгчийг шалгах
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Сешн дууссан байна!");
        return;
    }

    // Supabase-ийн 'budgets' хүснэгт рүү хадгалах
    const { error } = await supabase
        .from('budgets')
        .insert([
            {
                user_id: user.id,
                category: category,
                limit_amount: limitAmount,
                month_year: monthYear
            }
        ]);

    if (error) {
        alert("Төсөв тогтооход алдаа гарлаа: " + error.message);
    } else {
        alert(`${monthYear} сарын ${category} ангилалд төсөв амжилттай тогтоогдлоо!`);
        budgetForm.reset();
        
        // Bootstrap Offcanvas цэсийг автоматаар хаах код
        const instance = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasBudget'));
        if (instance) instance.hide();
        
        // Доор бичих төсвийн жагсаалтыг шинэчлэх функцийг дуудна
        if (typeof fetchBudgets === 'function') fetchBudgets();
    }
});


// Хэрэглэгчийн тогтоосон төсвүүдийг уншиж, Offcanvas доор жагсаах функц
async function fetchBudgets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('month_year', { ascending: false });

    if (error) {
        console.error("Төсөв уншихад алдаа гарлаа:", error.message);
        return;
    }

    const budgetsContainer = document.getElementById('current-budgets-list');
    
    if (!budgets || budgets.length === 0) {
        budgetsContainer.innerHTML = `
            <h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>
            <div class="text-center py-3 text-muted small bg-light rounded">Одоогоор төсөв тогтоогоогүй байна.</div>
        `;
        return;
    }

    // Тухайн хэрэглэгчийн бүх гүйлгээг авч, төсөв тус бүрийг хэтрүүлсэн эсэхийг тооцоход ашиглана
    const { data: allTransactions } = await supabase
        .from('transaction')
        .select('amount, type, category, date')
        .eq('user_id', user.id);

    let htmlContent = `<h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>`;
    
    for (const b of budgets) {
        // Тухайн төсвийн ангилал, сард хамаарах зарлагуудын нийлбэрийг тооцоолох
        let spentAmount = 0;
        if (allTransactions) {
            allTransactions.forEach(tx => {
                if (tx.type === 'expense' && tx.category === b.category && tx.date && tx.date.substring(0, 7) === b.month_year) {
                    spentAmount += tx.amount;
                }
            });
        }

        // Хэтрүүлсэн эсэхийг шалгаж, хэрэв хэтрүүлээгүй бол "Planner" тэмдэгийг олгоно
        const violated = spentAmount > b.limit_amount;
        let plannerBadgeHtml = '';
        if (!violated) {
            const wasAwarded = await awardBadgeIfNotExists(
                user.id,
                `Planner:${b.category}:${b.month_year}`
            );
            plannerBadgeHtml = `<span class="badge bg-success-subtle text-success ms-2" title="Энэ төсвийг хэтрүүлээгүй">
                <i class="fa-solid fa-bullseye"></i> Planner
            </span>`;
        }
        else{
            const wasRemoved = await removeBadgeIfExists(user.id,'Planner:${b.category}:${b.month_year}');
        }

        htmlContent += `
            <div class="card p-2 mb-2 bg-light border-0 shadow-sm">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fw-bold small text-dark">${b.category}</span>
                        <span class="text-muted mx-1">•</span>
                        <span class="small text-secondary">${b.month_year}</span>
                        ${plannerBadgeHtml}
                    </div>
                    <span class="fw-bold text-primary small">${b.limit_amount.toLocaleString()} ₮</span>
                </div>
            </div>
        `;
    }

    budgetsContainer.innerHTML = htmlContent;
}


// BADGE LOGIC
async function awardBadgeIfNotExists(userId, badgeName) {
    const { data: existing, error: selectError } = await supabase
        .from('badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_name', badgeName)
        .maybeSingle();

    if (selectError) {
        console.error("Тэмдэг шалгахад алдаа гарлаа:", selectError.message);
        return false;
    }

    if (existing) {
        return false;
    }

    const { error: insertError } = await supabase
        .from('badges')
        .insert([{
            user_id: userId,
            badge_name: badgeName,
            awarded_at: new Date().toISOString()
        }]);

    if (insertError) {
        console.error("Тэмдэг олгоход алдаа гарлаа:", insertError.message);
        return false;
    }

    return true;
}

async function getUserBadges(userId) {
    const { data, error } = await supabase
        .from('badges')
        .select('badge_name')
        .eq('user_id', userId);

    if (error) {
        console.error("Тэмдэг уншихад алдаа гарлаа:", error.message);
        return [];
    }

    return data.map(b => b.badge_name);
}

async function checkAndAwardBadges(transactions, user, totalIncome, totalExpense) {

    // 1. "Banker": Нийт гүйлгээний тоо 100-аас их байх
    if (transactions.length > 100) {
        await awardBadgeIfNotExists(user.id, 'Banker');
    }

    // 2. "Exchange": Нийт гүйлгээний тоо 1000-аас их байх
    if (transactions.length > 1000) {
        await awardBadgeIfNotExists(user.id, 'Exchange');
    }

    // 3. "Money Conscious": Нийт орлого нийт зарлагаас хэтрэхгүй байх
    if (totalBalance >= 0) {
        await awardBadgeIfNotExists(user.id, 'Money Conscious');
    } else {
        await removeBadgeIfExists(user.id, 'Money Conscious');
    }

    // 4. "Consistent": Аль нэг сарын эхнээс эцэс хүртэл өдөр бүр гүйлгээ хийсэн байх
    if (hasConsistentMonth(transactions)) {
        await awardBadgeIfNotExists(user.id, 'Consistent');
    }
    await renderNavbarBadges(user.id);
}


function hasConsistentMonth(transactions) {
    const monthToDays = {};

    transactions.forEach(tx => {
        if (!tx.date) return;
        const monthYear = tx.date.substring(0, 7); // "2026-06"
        const day = parseInt(tx.date.substring(8, 10), 10); // "11" -> 11

        if (!monthToDays[monthYear]) {
            monthToDays[monthYear] = new Set();
        }
        monthToDays[monthYear].add(day);
    });


    for (const monthYear in monthToDays) {
        const [yearStr, monthStr] = monthYear.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        const daysInMonth = new Date(year, month, 0).getDate();

        if (monthToDays[monthYear].size >= daysInMonth) {
            return true;
        }
    }

    return false;
}

async function renderNavbarBadges(userId) {
    const badgeNames = await getUserBadges(userId);

    let container = document.getElementById('navbar-badges');
    if (!container) {
        container = document.createElement('div');
        container.id = 'navbar-badges';
        container.className = 'd-flex align-items-center gap-2';

        const userEmailSpan = document.getElementById('user-email');
        if (userEmailSpan && userEmailSpan.parentNode) {
            userEmailSpan.parentNode.insertBefore(container, userEmailSpan);
        }
    }

    let htmlContent = '';

    if (badgeNames.includes('Consistent')) {
        htmlContent += `
            <span class="badge bg-info-subtle text-info" title="Сар бүр өдөр бүр гүйлгээ хийсэн">
                <i class="fa-solid fa-calendar-check"></i> Consistent
            </span>
        `;
    }

    if (badgeNames.includes('Money Conscious')) {
        htmlContent += `
            <span class="badge bg-warning-subtle text-warning" title="Орлого зарлагаас хэтрээгүй">
                <i class="fa-solid fa-piggy-bank"></i> Money Conscious
            </span>
        `;
    }

    if (badgeNames.includes('Banker')) {
        htmlContent += `
            <span class="badge bg-secondary-subtle text-secondary" title="100-аас дээш гүйлгээ хийсэн">
                <i class="fa-solid fa-building-columns"></i> Banker
            </span>
        `;
    }

    if (badgeNames.includes('Exchange')) {
        htmlContent += `
            <span class="badge bg-dark-subtle text-dark" title="1000-аас дээш гүйлгээ хийсэн">
                <i class="fa-solid fa-money-bill-transfer"></i> Exchange
            </span>
        `;
    }

    container.innerHTML = htmlContent;
}
async function removeBadgeIfExists(userId, badgeName) {
    const { error } = await supabase
        .from('badges')
        .delete()
        .eq('user_id', userId)
        .eq('badge_name', badgeName);

    if (error) {
        console.error("Тэмдэг хасахад алдаа гарлаа:", error.message);
        return false;
    }

    return true;
}