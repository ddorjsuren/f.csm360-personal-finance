import { supabase } from './supabase.js'

const authForm = document.getElementById('auth-form')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const btnRegister = document.getElementById('btn-register')
const submitBtn = document.getElementById('submit')
const messageDiv = document.getElementById('message')

function showMessage(text, cls = 'text-danger') {
    messageDiv.className = `text-center small mt-3 fw-medium ${cls}`
    messageDiv.textContent = text
}

function getInputs() {
    const email = emailInput.value.trim()
    const password = passwordInput.value
    return { email, password }
}

function validateInputs(email, password) {
    if (!email || !password) {
        showMessage('Имэйл болон нууц үгээ гүйцэд оруулна уу!')
        return false
    }
    if (password.length < 6) {
        showMessage('Нууц үг ядаж 6 тэмдэгт байх ёстой!')
        return false
    }
    return true
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const { email, password } = getInputs()
    if (!validateInputs(email, password)) return

    submitBtn.disabled = true
    showMessage('Нэвтэрч байна...', 'text-muted')
    await new Promise(r => setTimeout(r, 0))  // let the browser repaint

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    submitBtn.disabled = false

    if (error) {
        showMessage(error.message)
        return
    }
    else{
        showMessage('Амжилттай нэвтэрлээ!', 'text-success')
        setTimeout(()=>{
            window.location.href = 'dashboard.html'
        }, 1500)
    }
})

btnRegister.addEventListener('click', async () => {
    const { email, password } = getInputs()
    if (!validateInputs(email, password)) return

    submitBtn.disabled = true
    showMessage('Бүртгэж байна...', 'text-muted')
    await new Promise(r => setTimeout(r, 0))  // let the browser repaint


    const { data, error } = await supabase.auth.signUp({ email, password })

    btnRegister.disabled = false

    if (error) {
        showMessage(error.message)
        return
    }
    else{
        showMessage("Бүртгэл амжилттай!","text-success")
        passwordInput.value = ""
    }
})