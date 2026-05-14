# Register Console E2E Commands

Use these commands from Chrome DevTools Console while the register page is open:

```text
https://localhost:10443/?mode=register
```

Paste one block at a time. These commands are intended for local E2E/security testing of this project.

Before testing rate-limit cases, reset the rate-limit table from terminal:

```bash
bun run db:rate-limits:clear
```

## Frontend Validation

### 1. Empty Submit

```js
document.querySelector('button[type="submit"]').click()
```

Expected result: browser-native required-field validation stops the submit.

### 2. Short Username

```js
document.querySelector('[name="username"]').value = "qx"
document
  .querySelector('[name="username"]')
  .dispatchEvent(new Event("input", { bubbles: true }))
document.querySelector('[name="password"]').focus()
document.querySelector('[name="username"]').blur()
```

Expected result: username length error appears.

### 3. Username With Disallowed Character

```js
document.querySelector('[name="username"]').value = "nara_58@x"
document
  .querySelector('[name="username"]')
  .dispatchEvent(new Event("input", { bubbles: true }))
document.querySelector('[name="password"]').focus()
document.querySelector('[name="username"]').blur()
```

Expected result: username character-policy error appears.

### 4. Overlong Username

```js
document.querySelector('[name="username"]').value =
  "p4lguqtd3fh1s45ehq9n9ova4rioz62gb"
document
  .querySelector('[name="username"]')
  .dispatchEvent(new Event("input", { bubbles: true }))
document.querySelector('[name="password"]').focus()
document.querySelector('[name="username"]').blur()
```

Expected result: username length error appears because the value is 33 characters.

### 5. Too-Short Password

```js
document.querySelector('[name="username"]').value = "arden_42"
document
  .querySelector('[name="username"]')
  .dispatchEvent(new Event("input", { bubbles: true }))

document.querySelector('[name="password"]').value = "aB12z"
document
  .querySelector('[name="password"]')
  .dispatchEvent(new Event("input", { bubbles: true }))

document.querySelector('[name="confirm_password"]').focus()
document.querySelector('[name="password"]').blur()
```

Expected result: password field shakes and missing checklist rules pulse.

### 6. Password Without Uppercase

```js
document.querySelector('[name="password"]').value = "ravelstone72"
document
  .querySelector('[name="password"]')
  .dispatchEvent(new Event("input", { bubbles: true }))
document.querySelector('[name="confirm_password"]').focus()
document.querySelector('[name="password"]').blur()
```

Expected result: uppercase/lowercase requirement remains invalid.

### 7. Password Without Number

```js
document.querySelector('[name="password"]').value = "BravestoneX"
document
  .querySelector('[name="password"]')
  .dispatchEvent(new Event("input", { bubbles: true }))
document.querySelector('[name="confirm_password"]').focus()
document.querySelector('[name="password"]').blur()
```

Expected result: number requirement remains invalid.

### 8. Valid Password

```js
document.querySelector('[name="password"]').value = "Ardenvale92"
document
  .querySelector('[name="password"]')
  .dispatchEvent(new Event("input", { bubbles: true }))
```

Expected result: password checklist becomes valid.

### 9. Confirm Password Mismatch

```js
document.querySelector('[name="username"]').value = "mika_71"
document.querySelector('[name="password"]').value = "Ardenvale92"
document.querySelector('[name="confirm_password"]').value = "Borealvale92"

document
  .querySelector('[name="username"]')
  .dispatchEvent(new Event("input", { bubbles: true }))
document
  .querySelector('[name="password"]')
  .dispatchEvent(new Event("input", { bubbles: true }))
document
  .querySelector('[name="confirm_password"]')
  .dispatchEvent(new Event("input", { bubbles: true }))

document.querySelector('button[type="submit"]').click()
```

Expected result: frontend blocks submit with confirm-password mismatch.

## Backend Guard Bypass

These snippets bypass frontend validation with `form.noValidate = true` and `form.submit()`. The request still goes to the PHP backend, so backend validation should reject invalid payloads.

### 10. Backend Rejects Invalid Username

```js
const form = document.querySelector('form[action="/register.php"]')

form.noValidate = true
form.username.value = "sela_83@x"
form.password.value = "Ardenvale92"
form.confirm_password.value = "Ardenvale92"
form.submit()
```

Expected result: register page returns with username character-policy error.

### 11. Backend Rejects Password Longer Than 72 Characters

```js
const form = document.querySelector('form[action="/register.php"]')

form.noValidate = true
form.username.value = "lena_64"
form.password.value = `Aa1${"x".repeat(70)}`
form.confirm_password.value = form.password.value
form.submit()
```

Expected result: register page returns with password length error.

### 12. Backend Rejects Confirm Password Mismatch

```js
const form = document.querySelector('form[action="/register.php"]')

form.noValidate = true
form.username.value = "vano_39"
form.password.value = "Ardenvale92"
form.confirm_password.value = "Borealvale92"
form.submit()
```

Expected result: register page returns with confirm-password mismatch error.

### 13. Backend Rejects Duplicate Username

First, pick an existing username:

```bash
bun run db:users:raw
```

Then replace `EXISTING_USERNAME_HERE` before pasting:

```js
const form = document.querySelector('form[action="/register.php"]')

form.noValidate = true
form.username.value = "EXISTING_USERNAME_HERE"
form.password.value = "Ardenvale92"
form.confirm_password.value = "Ardenvale92"
form.submit()
```

Expected result: register page returns with duplicate username error.

### 14. Invalid CSRF Token

```js
const form = document.querySelector('form[action="/register.php"]')

form.noValidate = true
form.username.value = "raka_52"
form.password.value = "Ardenvale92"
form.confirm_password.value = "Ardenvale92"
form.csrf_token.value = "0".repeat(64)
form.submit()
```

Expected result: server returns HTTP 403 with `Form Rejected`.

### 15. Register Rate Limit

Reset rate limits first:

```bash
bun run db:rate-limits:clear
```

Then paste this in the browser console:

```js
await fetch("/register.php", {
  method: "POST",
  credentials: "same-origin",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    csrf_token: document.querySelector('[name="csrf_token"]').value,
    username: "qa",
    password: "Ardenvale92",
    confirm_password: "Ardenvale92",
  }),
})

await fetch("/register.php", {
  method: "POST",
  credentials: "same-origin",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    csrf_token: document.querySelector('[name="csrf_token"]').value,
    username: "rb",
    password: "Ardenvale92",
    confirm_password: "Ardenvale92",
  }),
})

await fetch("/register.php", {
  method: "POST",
  credentials: "same-origin",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    csrf_token: document.querySelector('[name="csrf_token"]').value,
    username: "sc",
    password: "Ardenvale92",
    confirm_password: "Ardenvale92",
  }),
})

const form = document.querySelector('form[action="/register.php"]')

form.noValidate = true
form.username.value = "tama_47"
form.password.value = "Ardenvale92"
form.confirm_password.value = "Ardenvale92"
form.submit()
```

Expected result: the final submit returns HTTP 429 with `Too Many Attempts`.

## Valid Registration

```js
const form = document.querySelector('form[action="/register.php"]')

form.noValidate = true
form.username.value = "orren_84"
form.password.value = "Ardenvale92"
form.confirm_password.value = "Ardenvale92"
form.submit()
```

Expected result: registration succeeds and redirects to the login page. If this username already exists from a previous run, delete it from the database or change only the numeric suffix.
