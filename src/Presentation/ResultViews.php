<?php

declare(strict_types=1);

function render_welcome_page(string $username): string
{
    $content = render_result_page_shell(
        '
          <h1 class="text-4xl font-semibold tracking-tight text-foreground dark:text-white">Welcome, ' .
            escape_html($username) .
            '!</h1>
          <form method="post" action="/logout.php" class="mt-10">
            <input type="hidden" name="csrf_token" value="' .
            escape_html(csrf_token()) .
            '">
            <button class="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50 px-5 text-sm font-medium text-rose-700 hover:bg-rose-500 hover:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-300 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500 dark:hover:text-white dark:focus:ring-rose-400/35" type="submit">Logout</button>
          </form>
        ',
        "max-w-2xl",
    );

    return render_layout("Welcome | Au7h", $content);
}

function render_not_registered_page(): string
{
    $content = render_result_page_shell('
          <div class="space-y-4">
            <h1 class="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">You are not registered yet</h1>
            <p class="text-sm leading-6 text-muted-foreground">
              <span class="block">The username or password is incorrect.</span>
              <span class="block">Try logging in again or create a new account.</span>
            </p>
          </div>
          <div class="mt-8">
            <a class="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200" href="/?mode=register">Back to form</a>
          </div>
        ');

    return render_layout("Not Registered Yet", $content);
}

function render_error_page(string $title, string $description): string
{
    $content = render_result_page_shell(
        '
          <p class="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Access denied</p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight text-foreground">' .
            escape_html($title) .
            '</h1>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">' .
            escape_html($description) .
            '</p>
          <a class="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200" href="/">Back</a>
        ',
    );

    return render_layout($title, $content);
}
