"""Read-only browser reconnaissance against the isolated test UI server."""
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1440,"height":1000},device_scale_factor=1)
    page.goto('http://127.0.0.1:5174')
    page.wait_for_load_state('networkidle')
    page.get_by_label('E-Mail-Adresse',exact=True).fill('admin@example.test')
    page.get_by_label('Passwort',exact=True).fill('test-password-123')
    page.get_by_role('button',name='Anmelden',exact=True).click()
    page.get_by_role('heading',name='Alles für dein Team.').wait_for()
    page.wait_for_load_state('networkidle')
    Path('test-results').mkdir(exist_ok=True)
    page.screenshot(path='test-results/qa-desktop.png',full_page=True)
    page.set_viewport_size({"width":390,"height":844})
    page.screenshot(path='test-results/qa-mobile.png',full_page=True)
    print(page.evaluate('''() => ({width:innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).slice(0,35)})'''))
    browser.close()
