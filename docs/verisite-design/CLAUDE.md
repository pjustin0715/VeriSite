# VeriSite: frontend guide

VeriSite is a mobile app for the PLDT hackathon. Citizens scan a project's paskil or the actual site, AI flags possible problems, and reports reach the LGU. It is made for seniors but usable by everyone.

## Design source
- `screens/` holds the final mockup as 19 clickable HTML files. Open `screens/W-Welcome.html` to start.
- `screenshots/` holds a PNG of every screen at phone size. Files ending in `-full` show the whole scrolling page. Match these closely.
- `assets/` holds the illustrations and mascot.
- These files are the only design source. Ignore any older BantayAsenso or earlier mockup versions.
- The mockups are for looks and flow. Rebuild them as real components instead of copying the inline HTML.
- Ask before choosing the tech stack if the project does not already have one.

## Screens
- Entry: Welcome, Login, Signup, Verify
- Main: Home (news feed), Filter, Map, Priority, LGUDetail, Project
- Scan flow: Scan, Loading, Result, Error, Sent
- Account: Profile, Badges, MyReports, Updates
- There is no guest mode. Everyone must sign up or log in before using the app. Do not add a "Bisita muna" button or any guest screens.

## Product rules
- Bottom navigation has 3 items only: Simula, Scan, Mapa.
- There is no separate report button. Reporting happens on the Result screen after a scan.
- Scan checks both the paskil and the site for possible hazards. Scan has no sample photo button.
- The Result screen groups the project match, AI checks, the user's description and the send action.
- Billboard checks use a "Mali ang impormasyon" checkbox with a dropdown for Contract ID, project name, contractor, office, budget, start date and target date. These match `SIGN_SCHEMA` in the scan API. "Walang paskil sa lugar" is a separate checkbox.
- The report description is typed by the user and is optional (label "opsyonal", placeholder "Ikomento ang iyong reklamo"). The AI does not write it.
- On Result, a checked item has the red tile and red outline. Unchecking it turns it gray with no outline.
- After reporting, Sent leads back to Home.
- Home is a news feed of all projects with filters.
- Map uses the illustrated map with status pins and report counts. "Tingnan ang listahan" opens the LGU priority list using the same pins.
- Public reports show the username and badge.
- Logged-in users earn a streak for each day they report, plus badges by report count: Baguhan 1+, Tanso 10+, Pilak 25+, Ginto 50+, Diyamante 100+.
- A higher badge places the report higher in a project's report list.
- There is no voice recording.

## Phone layout
- Design size is 390 x 844, but layouts must also work on smaller phones such as 360 x 740.
- Keep content clear of the status bar and home bar. Use safe-area insets, about 44px at the top and 34px at the bottom.
- Use `100dvh` for screen height. Avoid fixed page heights in the real app.
- Page content scrolls. The bottom navigation and bottom action bars stay fixed and must not cover content.

## Language
- UI text is fully Tagalog, easy and simple. Avoid deep Tagalog and everyday Taglish.
- Use "report", not "ulat". Use "Mga Update", not "abiso". Use "lampas sa petsa", not "late".
- Do not show "HALIMBAWA" labels.
- Do not add shield notes about privacy or AI on screens.
- The priority list is an urgency ranking to get the LGU's attention. Never promise that the LGU will act first or act at all.

## Design tokens
- Font: Outfit, weights 500, 600 and 700
- Text: ink `#1E2B30`, gray `#5F6E74`, header secondary `#2A4A5C`
- Primary blue: `#1C86CC`; dark link blue `#136AA6`; soft blue `#E3F3FC`
- Page background: `#F2F9FD`; lines `#E4EEF4`
- Yellow button: `#F6C744` with ink text
- Status: Lampas `#C9342B`, Malapit na `#D9861E`, Ayon sa plano and Naaksyunan `#2E9E6B`, Hindi kumpirmado `#6B7A80`
- Streak orange: `#E8681C`
- Badges: Baguhan `#6FBF96`, Tanso `#C98A4B`, Pilak `#A3B2BA`, Ginto `#F6C744`, Diyamante `#58C4D6`
- Radius: cards 20px, buttons 18px, sheets 28px
- Minimum text size 14px; main buttons 60px tall

## Visual rules
- Gradients are for backgrounds, headers and cards only. Buttons and icons use solid colors.
- All check icons are green.
- Header text on the sky uses `text-shadow: 0px 1px 5px #00000033`. Its subtext uses the same color with no shadow.
- A sad mascot has a small frown.
- Status labels in Aking mga report use a solid status color with a white icon and white text.
- Grass is green and buildings are not blue.
- The mascot is a simple living traffic cone. It belongs in the scene, with its legs never covered by a card.
- Do not use real photos. Illustrations stay infrastructure-focused.
- Keep large tap targets and clear contrast for seniors.
