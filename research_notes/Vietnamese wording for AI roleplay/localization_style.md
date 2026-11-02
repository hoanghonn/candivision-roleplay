# Vietnamese software text: natural versus machine-translated, and what style guidance says

How to read these notes:

- **Authority** = a published style guide that governs real translation work. The only software-specific one I could read in full is the Microsoft Vietnamese Localization Style Guide (60 pages, undated, contains a 2023 copyright example and a Copilot section). I read it by extracting the PDF text myself, and page numbers below refer to the PDF. WordPress.org's community guide and the City of Portland guide are secondary.
- **Research** = academic paper.
- **Practitioner** = Vietnamese UX writers or blogs. These are opinions, not standards.
- **Vendor** = localization or ASO companies selling services. Treat as weak evidence.
- **(own example)** = written by me to illustrate a rule. It is not from any source and has not been checked by a native UX writer.
- **[snippet only]** = I saw this only in a search result excerpt and did not read the page. Lower confidence.

Source short names used throughout:

- MS = [Microsoft Vietnamese Localization Style Guide](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- WP = [WordPress.org Style Guide cho dịch tiếng Việt](https://vi.wordpress.org/style-guide-cho-dich-tieng-viet/) (Dat Hoang, last modified 29 July 2025)
- Portland = [City of Portland Parks & Recreation Translation Style Guide for Vietnamese](https://termsbase.mindlinkresources.com/wp-content/uploads/sites/14/2023/11/Parks_Vietnamese_StyleGuide_FINAL.pdf) (Mindlink Resources, 14 Nov 2023; public-sector, not software)
- Nguyen 2022 = [Nguyen Xuan My, Strategies for Translating English Passive Sentences into Vietnamese, IJTE 2(1)](https://i-jte.org/index.php/journal/article/download/90/43/1197)
- Dương 9 tips = [Thùy Dương, 9 mẹo cải thiện nội dung UX, Great UX Writing, 25 Oct 2022](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux)
- Dương style guide = [Thùy Dương, Cấu trúc và cách viết Bộ Quy chuẩn nội dung, 15 Nov 2022](https://greatuxwriting.substack.com/p/cau-truc-va-cach-viet-bo-quy-chuan)
- Minara = [Minara, UX writing: Nghệ thuật thiết kế bằng ngôn từ, 9 Dec 2021, no named author](https://vietnam.minara.vn/blogs/blog/ux-writing-nghe-thuat-thiet-ke-bang-ngon-tu)
- X-Profile = [Phương Nhã, 9 Nguyên tắc tối ưu UX Writing, 2 Oct 2023](https://blog.xprofile.vn/9-nguyen-tac-toi-uu-ux-writing-cho-nguoi-moi/)

## 1. What Microsoft, Apple, Google and other authorities say about tone, address, capitalisation, punctuation, passive voice and loanwords

### Takeaway
Microsoft is the only major vendor with a public Vietnamese guide, and it is firm: write as if the product were originally written in Vietnamese, in clear, friendly, everyday language, addressing the user as "bạn", in sentence case. I found no public Vietnamese prose guidance from Apple or Google.

### Cited Findings

**Authority - Microsoft: tone and rewriting**
- General style "should be clear, friendly and concise", using language resembling everyday conversation "as opposed to the formal, technical language" often used in technical and commercial content (p.6) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Translators should "modify or re-write translated strings", understand the whole intent, then "re-write just like you are writing the contents yourselves", and may remove unnecessary content (p.6) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Product language should have the "look and feel" of a product originally written in Vietnamese, "using idiomatic syntax and terminology" (p.43) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Word-for-word translation makes the tone "stiff and unnatural". Text may be split into separate sentences and descriptors may be omitted to make it snappier (p.8) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Tone should fit text and audience: informal and playful for most products and games, "more formal, informative, and factual" for technical content (p.59, in the video section) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- For AI prompts specifically: keep it conversational, "avoid adopting a tone that resembles a machine", use an informal tone and form of address, be polite and professional, no slang or jargon (p.45) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Regional standard: Northern is recommended. "Gửi thư" over "Gởi thơ", "Chọn" over "Lựa" (p.59) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)

**Authority - Microsoft: address**
- Address the user directly. Third-person references such as "user" sound formal and impersonal (p.8). The pronoun table lists "Bạn, anh, chị" for "you" (p.29), but every sample string uses "bạn" - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- "Don't use gendered pronouns (ông, bà, cô, dì, dượng, chú, bác, anh, chị) in generic references." Rewrite with "bạn", a plural noun, or a role such as "khách hàng" or "người dùng", or use "người đó" (p.16) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Avoid slashes combining genders, except in cases such as licence terms and table headers (p.16) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- For generalisations use plural forms such as "quý vị, các bạn, họ" (p.16). "Chúng ta" includes the audience, "chúng tôi" does not (pp.30, 33) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)

**Authority - Microsoft: capitalisation**
- "In Vietnamese, only the first character in a sentence is capitalized." Buttons, menus and titles: "Chọn tất cả", not "Chọn Tất Cả"; "Máy chủ tự động", not "Máy Chủ Tự Động" (p.24) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Named features get a capital on the first word of the compound: "Hiện Khởi động nhanh" (p.24). Proper names capitalise every word: "Việt Nam", not "Việt nam" (p.24) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Internal inconsistency: p.28 says "we accept title capitalization" with "Mô tả Nhà cung cấp Dữ liệu Tin cậy". This sits awkwardly with p.24 - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- WordPress agrees with sentence case: "Chỉnh sửa hồ sơ của tôi", not "Chỉnh sửa Hồ sơ của tôi" or "Chỉnh sửa Hồ sơ Của tôi" - [WP](https://vi.wordpress.org/style-guide-cho-dich-tieng-viet/)
- Do not capitalise a personal pronoun, except in personal letters and questionnaires - [Portland](https://termsbase.mindlinkresources.com/wp-content/uploads/sites/14/2023/11/Parks_Vietnamese_StyleGuide_FINAL.pdf)

**Authority - Microsoft: punctuation**
- Space after, none before, `. , ! ? :`. No comma before "và" or "hoặc". Decimal comma and thousands period: "1.526", "5,25 cm". No space between number and %; space between number and unit (pp.34-35, 40) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- "Use a period after an error message" (p.47). Closing quotation mark goes before the period or comma: "“Chào anh Frank”, HAL chào." (p.39) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Do not carry English hyphenated compounds across: "Left-to-right" becomes "Từ trái sang phải" (p.36) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- End-of-sentence marks should follow the source - [WP](https://vi.wordpress.org/style-guide-cho-dich-tieng-viet/)
- Conflict on periods: Dương reports that Google's guide omits the period on single sentences and uses it only in paragraphs of two or more sentences, while other guides keep periods everywhere except headings (second-hand, I did not locate the Google text) - [Dương style guide](https://greatuxwriting.substack.com/p/cau-truc-va-cach-viet-bo-quy-chuan); contrast [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)

**Authority - Microsoft: passive voice**
- There is no dedicated Vietnamese passive-voice rule. The relevant signals are examples: the "new" version of a sentence removes two "được" ("mọi kết nối được hình thành qua các kênh dữ liệu được mã hóa toàn bộ" becomes "kết nối qua các kênh dữ liệu mã hóa toàn bộ") (p.26), and error messages use "impersonal active voice" (p.48) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- "Được" is not banned: "Địa chỉ website sẽ được gửi cho Microsoft" appears as correct (p.23) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Portland: "In general, use active voice rather than passive voice, but please feel free to use passive structures as well" and "Try to use verbs, not verbal nouns" - [Portland](https://termsbase.mindlinkresources.com/wp-content/uploads/sites/14/2023/11/Parks_Vietnamese_StyleGuide_FINAL.pdf)

**Authority - Microsoft: loanwords** (see question 6 for detail)
- Keep English when ambiguous if translated (OK, tab), familiar (monitor, modem), an abbreviation (PC, USB), too long when translated, or a new concept where translation would confuse (p.23) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)

**Apple and Google**
- Apple publishes downloadable glossaries of translated system strings, not a Vietnamese style guide [snippet only] - [Apple localization resources](https://developer.apple.com/localization/resources). An Apple job advert lists maintaining style guides as a Vietnamese translator's duty, which suggests an internal guide exists [snippet only] - [Apple Jobs](https://jobs.apple.com/de-at/details/200501394/technical-translator-vietnamese)
- [Microsoft's style guide index](https://learn.microsoft.com/globalization/reference/microsoft-style-guides) lists Vietnamese among its languages [snippet only].

### Inferences
- Use MS as the baseline, but do not copy its sample strings blindly. Some of its own "correct" Vietnamese reads translated, for example "chúng tôi sẽ tiếp tục từ nơi chúng tôi vừa rời khỏi" (p.12) and "Kiểm tra các bản cập nhật trong ngôn ngữ đã cài đặt Media Player" (p.23). This is my reading, not a stated caveat. Its principles are stronger than its examples.
- Sentence case and no gendered generic pronouns are the two firmest mechanical rules available.

### Gaps
- No public Apple or Google Vietnamese prose guidance found. I did not get into Apple's glossaries, which sit behind a developer download.
- [Mozilla's Vietnamese team page](https://wiki.mozilla.org/L10n:Teams:vi) links a style guide [snippet only]; I did not retrieve it. GNOME and KDE Vietnamese guides did not surface.
- I did not query the Microsoft Terminology database, so no per-term results from it are included.

## 2. Documented signs of English-to-Vietnamese literal translation

### Takeaway
Microsoft directly documents several of these signs: possessives, "việc", articles, unneeded "đã/đang/sẽ", "X thất bại" errors and English word order. For "được/bị" the evidence supports "reduce, do not ban". I found no source documenting "sự", and only soft evidence on "các".

### Cited Findings

**Authority - Microsoft, per word**
- **"của" / possessives:** "The frequent use of possessives is a feature of the English language" (p.21). Some cases "need to add 'của' for clarity" (p.29), and it is shown as optional in "Hệ thống truyền hình (của) Việt Nam" (p.28). Rewrites drop "your": "back up your files" becomes "Bạn nên thường xuyên sao lưu tệp" (p.6); "save your work" becomes "lưu công việc" (p.13) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **"việc":** "Reading this book is compulsory" is "Đọc cuốn sách này là bắt buộc", and it is "not necessary to add the article 'việc' before the verb" (p.42) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **"một":** "articles (a/an/the) in the source do not require translation", but translate "a/an" when it means one (p.22). MS's own strings still include "một" sometimes: "Nhập một đoạn văn bản mô tả" (p.25) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **"các" / "những":** described as definite and indefinite plural markers (p.31). There is no rule against them, and strings keep them ("các gói codec này", p.6) or drop them ("sao lưu tệp", p.6). "theo các bước sau đây" is listed as classic and "theo cách sau" as modern (p.10) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **"đã / đang / sẽ":** "Except for emphasizing purpose, sometimes we do not use adverb 'đang,' 'đã,' and 'sẽ'" (p.41); "in case it is not necessary to emphasize, it will be omitted" (p.29); "Mai tôi (sẽ) đi TP HCM" (p.29). Errors "do not distinguish past and present tense" (p.48). "Cài đặt xong." renders "The installation is finished." (p.38) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **"X thất bại":** "Image save failed" is "Không lưu được hình ảnh", and "Lưu hình ảnh thất bại" is marked incorrect (p.9). "Failed to download" moves from "Tải về không thành công" (classic) to "Không tải được" (modern) (p.10) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **Word order:** Vietnamese compounds run inverse to English: "Internet Accounts" is "Tài khoản Internet" (p.25). Adjective follows noun, adverb precedes verb (p.26). Order changes meaning: "Điểm yếu" (weak point) versus "Yếu điểm" (important point) (p.21) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **Long noun phrases:** "Overly long or complex compounds should be avoided" (p.25) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **Prepositions:** "Many translators, influenced by the English language, omit them or change the word order" (p.31). Use "trên thanh công cụ" for "in the toolbar", "cập nhật lên" for "update to" (pp.32-33) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **"We recommend that you...":** becomes "Bạn nên..."; "We strongly discourage you from..." becomes "Bạn không nên..." (p.6) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- **Idiom:** "Feel free to reply this email" is "Vui lòng trả lời email này", not "Cứ thoải mái trả lời email này" (p.9) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)

**Research - "được" and "bị"**
- In a corpus of 672 English passives from two published books (a novel and a popular-science book), translators used "bị/được" in 406 cases (60%), active forms 15%, paraphrase 12%, omitted the marker 10%, omitted the passive 3%. The author says this disapproves the view that active sentences are the dominant choice - [Nguyen 2022](https://i-jte.org/index.php/journal/article/download/90/43/1197)
- Agentless passives about generalisations, and English it-clefts, tend to go active in Vietnamese - [Nguyen 2022](https://i-jte.org/index.php/journal/article/download/90/43/1197)
- Reviewed literature: a neutral or subjectless form is used when translators want to avoid the negative sense of "bị" or the positive sense of "được". Example: "The window was shut" becomes "Cửa sổ đã đóng hết". Others argue active form better suits "the style of Vietnamese" - [Nguyen 2022](https://i-jte.org/index.php/journal/article/download/90/43/1197)
- Good model from the same paper: "'Potter's been sent a broomstick, Professor'" becomes "Thưa giáo sư, có người gởi cho Harry cây chổi ạ!", using "có người" rather than a passive - [Nguyen 2022](https://i-jte.org/index.php/journal/article/download/90/43/1197)
- Linguist Benjamin Bruening argues these morphemes are not passive markers as such, and that "được" carries a benefactive sense [snippet only] - [Bruening](https://udel.edu/~bruening/Downloads/VietnamesePassives7.pdf)
- A study of 10 English computing texts treats keeping the English passive structure as the easiest route, noting passives can become Vietnamese passive, active or middle sentences [snippet only; the PDF is a scan I could not read] - [VNU Journal of Foreign Studies](https://js.vnu.edu.vn/FS/article/view/2138/2037)

**Practitioners and vendors**
- Dương's preferred rewrite still uses "được": "Thông tin của bạn đã được cập nhật vào “Biểu mẫu đăng ký”. Bạn vui lòng kiểm tra và xác nhận thông tin." - [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux)
- WordPress uses "Tài khoản của bạn đã được kích hoạt!" as a correct example, though that page is demonstrating punctuation - [WP](https://vi.wordpress.org/style-guide-cho-dich-tieng-viet/)
- "Think outside the box" should not be "Nghĩ bên ngoài cái hộp"; "Thành công của bạn, theo cách của bạn" is called a direct rendering that misses local values - [1StopAsia, vendor](https://www.1stopasia.com/blog/english-to-vietnamese-localization-mistakes/)
- "Break boundaries" is "Vượt mọi giới hạn", not the literal "Phá vỡ các ranh giới" (my reconstruction of diacritics the PDF extraction garbled) - [1StopAsia quality guide, vendor](https://www.1stopasia.com/blog/wp-content/uploads/articles-download/Vietnamese-Language-Quality-Guide-Marketing-and-Copywriting-%20Final.pdf)

### Inferences
- Nguyen's 60% describes what published book translators do, not what reads naturally. It may itself reflect English interference, and the paper does not assess naturalness. It does warn against claiming "Vietnamese has no passive" or "never use được". The defensible rule is that an agentless UI passive should usually lose "được", while a real benefit or a named agent can keep it.
- "Bị" signals something unwelcome, so it adds blame or alarm when none is meant. This is especially relevant in coaching feedback (own reasoning, based on the bị/được connotation noted in Nguyen 2022).
- Test for translated text (own heuristic): if deleting "của bạn", "các", "một", "việc", "đã", "được" or "sẽ" leaves the meaning intact, delete it.

Illustrative pairs (own examples, not from sources):

| Sign | Reads translated | Reads natural |
|---|---|---|
| được + của + success word | Buổi luyện tập của bạn đã được lưu thành công. | Đã lưu buổi luyện tập. |
| bởi + passive + một | Một báo cáo sẽ được tạo bởi AI sau khi cuộc gọi được kết thúc. | Cuộc gọi kết thúc, AI sẽ làm báo cáo ngay. |
| việc | Việc luyện tập thường xuyên là rất quan trọng. | Luyện thường xuyên rất quan trọng. |
| sự + đang được | Sự phản hồi của quản lý đang được chờ đợi. | Đang chờ quản lý nhận xét. |
| thất bại | Tạo kịch bản thất bại. | Không tạo được kịch bản. |
| chúng tôi khuyến nghị | Chúng tôi khuyến nghị rằng bạn nên hoàn thành các bài tập của bạn. | Bạn nên làm xong các bài tập. |
| dummy verb | Thực hiện việc đánh giá cuộc gọi | Đánh giá cuộc gọi |
| bị | Bạn đã bị đánh giá thấp ở phần mở đầu. | Phần mở đầu chưa tốt. |

### Gaps
- I found no source that specifically documents overuse of "sự" in software translation. Its entry above rests on analogy with the "việc" rule and Portland's "verbs, not verbal nouns".
- No source quantifies these markers in machine translation output versus native UI text.
- A claimed 2000 survey by Hoàng Thị Phương Thảo and Trần Thuần on over-reliance on "bị/được" appeared in a search summary, but I could not trace it to a page, so it is not relied on.
- Nguyễn Đức Dân's *Từ câu sai đến câu hay* is recommended by [Dương](https://greatuxwriting.substack.com/p/cau-truc-va-cach-viet-bo-quy-chuan) for punctuation and is a likely source on câu dịch, but it is a book and I could not check it.

## 3. When pure Vietnamese is clearer than Sino-Vietnamese

### Takeaway
No authority or UX writer I could find frames this as thuần Việt versus Hán Việt. They frame it as everyday and short versus formal and bookish. The working test is familiarity to the reader, not etymology.

### Cited Findings

**Authority**
- "Use plain language. Use straightforward, concrete, familiar and current/up-to-date" words. Examples of the method: a two-syllable word over a three-syllable word, or several clear words instead of one complicated term (p.14) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- The Vietnamese voice "is not using old-fashioned, too formal or archaic words" (p.10). Users are "often reluctant to read and understand long text, especially when it contains obscure words" (p.8) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Short forms: "hủy" rather than "hủy bỏ"; "nhập" rather than "nhập vào" or "đưa vào" (p.8) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- English formal-to-plain list the Vietnamese should mirror: Configure to Set up, Terminate to End, Resolve to Fix, Utilize to Use, Obtain to Get, Perform to Do (pp.9-10) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Audience matters: technical terms for technical audiences, common words for consumers (p.5) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- "Use words that are used in daily life by ordinary people", don't use "bookish" words unless they are necessary technical terms; "Use terms that are common in the business or industry" - [Portland](https://termsbase.mindlinkresources.com/wp-content/uploads/sites/14/2023/11/Parks_Vietnamese_StyleGuide_FINAL.pdf)

**Practitioners**
- Prefer "Kết nối", "Lưu", "Tải xuống"; avoid "Định cấu hình", "Cam kết", "Truyền dữ liệu" - [Minara](https://vietnam.minara.vn/blogs/blog/ux-writing-nghe-thuat-thiet-ke-bang-ngon-tu)
- Aim for roughly grade-8 readability, short words, about 11 words per sentence. The rewrite drops "thông tin định danh" and "sai lệch" - [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux)
- Check real user vocabulary: Dương used Google Trends to compare "đặt hàng, mua hàng, đặt mua" and "mua hàng" led - [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux)

**General and low-authority sources**
- Sino-Vietnamese is suggested for specialist fields such as education, medicine and law, where precision matters [snippet only] - [FPT Shop](https://fptshop.com.vn/tin-tuc/danh-gia/tu-han-viet-la-gi-189518)
- A VnExpress opinion piece reportedly cites "thu dung bệnh nhân F0" as harder than "tiếp nhận bệnh nhân" [snippet only; the fetch failed] - [VnExpress](https://vnexpress.net/lam-dung-tieng-anh-4373194.html)

### Inferences
- A blanket "avoid Hán Việt" rule would be wrong. Many of the words recommended above are Sino-Vietnamese or partly so, such as "kết nối", "đăng nhập" and "tài khoản", because they are the everyday words. Minara's reject list also contains "dữ liệu", which is a normal word. Target the unfamiliar, the ceremonial and the padded, rather than a word's origin.
- Dương's "one syllable" advice appears to be imported from English readability formulas and maps poorly onto Vietnamese, where the syllable is the basic unit. Keep the intent (short, common words) and drop the literal metric.

Replacements (own examples, for native review):

| Stiff | Plainer | Note |
|---|---|---|
| khởi tạo | tạo | keep "khởi tạo" only for developers |
| định cấu hình | thiết lập, cài đặt | supported by Minara and MS's Configure to Set up |
| tiến hành, thực hiện + verb | the verb alone | "Tiến hành đánh giá" becomes "Đánh giá" |
| khắc phục | sửa | MS's Resolve to Fix |
| hoàn tất | xong | keep "hoàn tất" where a formal step is meant |
| kích hoạt (a practice session) | bắt đầu, mở | keep for accounts and licences |
| truy xuất | xem, lấy | |
| nhằm mục đích | để | |

Keep, because they are the established and clearer terms (own judgement): ứng viên, tuyển dụng, phỏng vấn, đánh giá, kịch bản, báo cáo, tài khoản.

### Gaps
- I found no Vietnamese UX writer or authority that explicitly discusses thuần Việt versus Hán Việt in product text. This remains a real gap. The replacement table is my own and needs a native review.

## 4. How to write buttons, headings, errors, empty states and status labels, including "vui lòng", "hãy" and none

### Takeaway
Buttons and short instructions take a bare verb. Errors say plainly what did not work, using "Không ... được" or "Không thể ...", then give the fix. "Vui lòng" is the polite request form and belongs in messages, not on buttons. "Hãy" is optional and often removable. Sources do not settle "vui lòng" versus "xin".

### Cited Findings

**Authority - buttons and fragments**
- Fragments are used "whenever possible": "Dùng ngay phiên bản đầy đủ" over "Hãy bắt đầu sử dụng phiên bản đầy đủ ngay"; "Nếu còn sự cố" over "Nếu bạn vẫn còn sự cố" (pp.39-40) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Button and menu forms take a bare verb and sentence case: "Chọn tất cả" (p.24); "All ready to go" is "Sẵn sàng sử dụng" (p.11) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- If space forces it, abbreviate carefully, but never "thanks", "sorry" or "please" (p.19) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)

**Authority - hãy, vui lòng, xin**
- Plain imperative: add "Hãy" ("Hãy đọc kỹ đoạn văn bản sau"). In a subordinate clause it is optional: "Để giải quyết vấn đề này, (hãy) hỏi..." (p.42) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- "Please read..." takes "Vui lòng đọc..." (p.42). "Please" maps to "Làm ơn/ Vui lòng" (p.19) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Internal conflict: "Please wait" lists "Vui lòng đợi" as classic and "Xin chờ" as modern (p.10), yet samples freely use "Vui lòng" as the correct modern form ("Vui lòng kiểm tra và nhập lại", p.11; "Vui lòng thử lại sau!", p.8), and one uses "xin thử lại" (p.11) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Portland uses "vui lòng truy cập" and the longer "xin vui lòng email" - [Portland](https://termsbase.mindlinkresources.com/wp-content/uploads/sites/14/2023/11/Parks_Vietnamese_StyleGuide_FINAL.pdf)

**Authority - errors**
- Natural, empathetic, "not robot-like". Declarative form, with a period at the end. Use "lỗi" for "error": "An error occurred" is "Có lỗi." (p.47) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Standard forms (p.48): "Could not/Cannot" is "Không ... được" ("Không tìm được tệp"); "Failed to connect" is "Không kết nối được"; "Cannot find/Unable to locate" is "Không tìm thấy..."; "Insufficient" is "Không đủ...". Consolidate English variants into one Vietnamese phrase - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Errors should carry the action: "Mật khẩu không đúng, xin thử lại." and "Khóa sản phẩm này không đúng. Vui lòng kiểm tra và nhập lại." (p.11). Humour is not carried across: "Bad, bad server. No donut for you." is "Máy chủ đang gặp lỗi. Vui lòng thử lại sau!" (p.8) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Degree of negation matters: "không" (general), "chưa" (not yet), "chẳng" (does not care) (p.41) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Placeholders must be checked so the sentence stays grammatical (p.48) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)

**Practitioners**
- "Hãy viết" (write this): "Chúng tôi không thể thực hiện giao dịch. Bạn vui lòng thử lại." "Thay vì" (instead of): "Giao dịch thất bại. Vui lòng thử lại." Reading copy aloud is the test - [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux)
- Compress by parallel structure: "Xóa thư rác, tăng thêm 1GB dung lượng" over "Xóa thư mục rác để tăng thêm 1GB dung lượng" - [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux)
- Use the same word for the same action. "Mua hàng" in one flow and "đặt mua" in another makes users pause - [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux)
- "Đăng nhập để tải video" over "Bạn cần đăng nhập để tải xuống video" - [Minara](https://vietnam.minara.vn/blogs/blog/ux-writing-nghe-thuat-thiet-ke-bang-ngon-tu)
- "Nhấp vào nút Tìm kiếm" over "Cần nhấp vào nút Tìm kiếm để tìm thấy bài viết" - [Minara](https://vietnam.minara.vn/blogs/blog/ux-writing-nghe-thuat-thiet-ke-bang-ngon-tu)
- Length depends on context; sometimes about 10 words suits better than 3 - [Minara](https://vietnam.minara.vn/blogs/blog/ux-writing-nghe-thuat-thiet-ke-bang-ngon-tu)
- Conflict: Minara prefers "Không thể kết nối" and "Oops…" over "Lỗi kết nối" and "Error", while MS says always use "lỗi" for "error" and treats "Có lỗi" as standard - [Minara](https://vietnam.minara.vn/blogs/blog/ux-writing-nghe-thuat-thiet-ke-bang-ngon-tu); [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- An error should state the problem and the next step. The one textual example is "ứng dụng chưa nhận diện được thông tin bạn nhập, bạn hãy thử làm lại." - [X-Profile](https://blog.xprofile.vn/9-nguyen-tac-toi-uu-ux-writing-cho-nguoi-moi/)
- Don't joke when the user is frustrated: "Lúc người dùng bực bội, bạn sẽ không nên sử dụng giọng điệu vui vẻ để trêu đùa họ." - [Dương style guide](https://greatuxwriting.substack.com/p/cau-truc-va-cach-viet-bo-quy-chuan)
- Buttons need a specific action verb and a consistent formula for word count and capitals [snippet only] - [Jamstack Vietnam](https://jamstackvietnam.com/blog/cach-de-toi-uu-hoa-microcopy)

### Inferences

Recommended working rules (my synthesis):
- **Buttons:** verb first, 1 to 3 words, sentence case, no "hãy", "vui lòng" or "bạn", no period. Name the action rather than "OK" where possible.
- **Headings:** sentence case noun phrase or short question, no period, no leading "Các" or "Danh sách các".
- **Errors:** what failed, then what to do. Prefer "Không ... được" for failures and "chưa" for things not yet done. Add a period (MS). Never "thất bại" as the main phrasing.
- **Politeness:** use "Vui lòng" or "Bạn vui lòng" only when asking the user to do something, particularly after a problem. Use it at most once per message. For calm instructions, use the bare verb. "Bạn vui lòng thử lại" is warmer than "Vui lòng thử lại". "Xin" is acceptable but reads a little formal, and the evidence does not settle it, so pick one form per product and stay with it.
- **"Hãy":** treat as removable. Keep it only when actively encouraging, or after an "Để..." or "Nếu..." clause when the sentence sounds bald without it.
- **Empty states:** "Chưa có..." rather than "Không có dữ liệu", because "chưa" implies it will come, followed by the next step.
- **Status labels:** bare states with no "được" and no pronoun.

Illustrative strings (own examples):

| Element | Reads translated | Reads natural |
|---|---|---|
| Button | Vui lòng nhấn vào đây để bắt đầu | Bắt đầu luyện |
| Button | Thực hiện đánh giá | Đánh giá |
| Heading | Danh sách các buổi luyện tập của bạn | Buổi luyện tập |
| Error | Kết nối thất bại. | Không kết nối được. Bạn vui lòng thử lại. |
| Error | Một lỗi đã xảy ra. | Có lỗi. Bạn vui lòng thử lại. |
| Error, input | Email đã nhập không hợp lệ. | Email chưa đúng. Bạn kiểm tra lại nhé. (informal) or Email không đúng. Vui lòng nhập lại. |
| Empty state | Không có dữ liệu để hiển thị. | Chưa có buổi luyện nào. |
| Status | Đang được xử lý | Đang xử lý |
| Status | Đã được hoàn thành | Đã xong |
| Status | Bị lỗi | Lỗi |
| Status, waiting | Đang chờ được đánh giá | Chờ đánh giá |
| Loading | Vui lòng đợi trong khi AI đang tạo báo cáo của bạn... | AI đang viết báo cáo... |

### Gaps
- No source gives explicit guidance for empty states or status labels in Vietnamese. Rules for those two are inference from the "chưa" nuance, the fragment rule and the "đang/đã" rule.
- No source specifies a word or character limit for Vietnamese buttons, or gives expansion data from English.
- No usage data found on how Vietnamese users perceive "vui lòng", "xin" or "hãy".

## 5. Pronoun choices for an app talking to working adults in a business product

### Takeaway
Use "bạn" for all product UI. Microsoft explicitly says not to use "anh" or "chị" generically and to rewrite with "bạn". Reserve "anh/chị" for known individuals or for in-scene dialogue. I found no direct evidence on business SaaS, so that application is my inference.

### Cited Findings

**Authority**
- MS samples use "bạn" throughout, and generic gendered pronouns including "anh" and "chị" are prohibited, with "bạn" the stated replacement (p.16); slashes combining genders are avoided except in cases such as licence terms and table headers (p.16) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Portland mixes "bạn" and "quý vị" and sets a "formal or semi-formal tone" for a public body, addressing people "personally and directly" - [Portland](https://termsbase.mindlinkresources.com/wp-content/uploads/sites/14/2023/11/Parks_Vietnamese_StyleGuide_FINAL.pdf)
- System voice: "chúng tôi" for the product acting on the user's behalf gives "a more personal feel" (p.12). First person "tôi" for the user's own settings: "Lưu mật khẩu của tôi" (p.6) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)

**Practitioners**
- "Lúc sử dụng “bạn” để nói chuyện với người dùng, ứng dụng muốn thể hiện sự thân thiết, sự tôn trọng và ngang hàng." Avoid overly intimate forms such as "bé yêu ơi", avoid "bồ", and record the pronoun standard in a style guide. Use "tôi" when the user confirms something: "Tôi đồng ý điều kiện và điều khoản dịch vụ của XYZ." - [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux)
- "bạn, của bạn" for the user and "chúng tôi, của chúng tôi" for the system - [Minara](https://vietnam.minara.vn/blogs/blog/ux-writing-nghe-thuat-thiet-ke-bang-ngon-tu)

**Vendors and informal sources**
- "bạn" in Ho Chi Minh City sales versus more formal "quý khách" or "anh/chị" in Hanoi depending on context - [1StopAsia, vendor](https://www.1stopasia.com/blog/mastering-vietnamese-market-localization/)
- The wrong pronoun can signal disrespect. Suggests "ông/bà" for customers over 50 and "chị" for a female professional in her 30s - [1StopAsia, vendor](https://www.1stopasia.com/blog/english-to-vietnamese-localization-mistakes/)
- "bạn" is neutral and safe when age cannot be judged [snippet only] - [Langi](https://langi.app/blog/vietnamese-pronouns-guide). Contrast: "bạn" can sound like a customer-service bot with an older person [snippet only] - [SVFF](https://svff.online/blog/vietnamese-pronouns-guide-expats-southern-dialect)
- A Spotify Vietnamese user complained about regional "cậu" where "bạn" was expected [snippet only, anecdote] - [Spotify Community](https://community.spotify.com/t5/Other-Podcasts-Partners-etc/Mobile-Other-Translation-issue-in-Vietnamese/td-p/5307564)

### Inferences
- Software rarely knows age or gender reliably, and "anh/chị" needs both. So "bạn" with fewer pronouns is the safe default. Often the best form is no pronoun at all, because Vietnamese allows dropping the subject, as MS's fragments show. This also softens any "bot" feel from repeating "bạn".
- Recommended scheme (mine):
  - **Product UI to the user:** "bạn", or no pronoun.
  - **Product to a manager about a trainee:** role noun or name, such as "nhân viên", "học viên" or the person's name. Never "anh ấy/cô ấy" when gender is unknown (MS p.16).
  - **User's own controls:** "tôi" ("Tôi đồng ý...").
  - **Product speaking:** omit it or use "chúng tôi" sparingly. Use "chúng ta" only if deliberately including the user.
  - **Formal emails or contracts to senior clients:** "Anh/Chị", capitalised and with the name known where possible. Note MS and Portland allow exceptions for such document types, not UI.
- **AI roleplay persona speech is a separate register from UI.** A persona playing a customer or manager should use the pronouns that scene demands (anh, chị, em, tôi, ...), because generic "bạn" between colleagues may sound off. MS's rule is about generic references, so it does not constrain in-scene dialogue. No source addresses this. It needs a native check.
- Avoid the literal "anh/chị" slash in UI: it reads like a form letter and conflicts with MS's slash guidance.

Own examples:

| Context | Avoid | Prefer |
|---|---|---|
| Greeting | Xin chào anh/chị! | Chào bạn, Lan! |
| Nudge | Người dùng nên hoàn thành bài luyện. | Bạn nên làm xong bài luyện. |
| Manager view | Anh ấy chưa làm bài. | Minh chưa làm bài. |
| Consent | Bạn đồng ý với các điều khoản. | Tôi đồng ý với điều khoản. |

### Gaps
- I found no evidence specifically about Vietnamese B2B software or enterprise products, or about how Vietnamese banks or HR tools handle address. No user research on "bạn" versus "anh/chị" for working adults was found.
- MoMo, Zalo, Tiki and Shopee's actual pronoun policies were not found.

## 6. Which English loanwords are accepted and which should be translated

### Takeaway
Authorities give criteria, not a business-word list. Acronyms stay in English. Terms with an established, shorter Vietnamese word get translated. No source gives a verdict on "demo", "feedback" or "review" for Vietnamese business users, so my table below is judgement.

### Cited Findings

**Authority**
- Criteria for keeping English: popular words ambiguous if translated (OK, tab), familiar words (monitor, modem), abbreviations (PC, USB), words too long if translated (README, Script), new concepts where translation would confuse (p.23) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Acronyms: "in Vietnamese all acronyms or abbreviations are kept unchanged from English". Do not create a Vietnamese acronym from a translated term (p.20). Spell out on first use in documentation (p.20), and if the audience differs, spell it out for general users (p.20) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Terms seen kept in MS strings: "email", "online", "web", "website", "PC", "tab", "menu", "Internet". Explicitly "ID" is modern and "mã định danh" is classic (p.10). Terms translated: "app" is "ứng dụng" in strings (p.13), "file" is "tệp", "password" is "mật khẩu", "server" is "máy chủ" - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Most feature names can be translated to be more user-friendly: "Print Preview" is "Xem trước khi in"; trademarks stay in English (p.43) - [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- Brand names keep exact form: "WordPress" - [WP](https://vi.wordpress.org/style-guide-cho-dich-tieng-viet/)

**Practitioners and vendors**
- Teams should keep an approved and disallowed word list. Words such as "hot, chatbot, data, internet" may be allowed in user-facing text while others are internal only. Allowed: "Một số từ cho phép sử dụng trong các văn bản đối thoại với người dùng" - [Dương style guide](https://greatuxwriting.substack.com/p/cau-truc-va-cach-viet-bo-quy-chuan)
- Use what users already know: Chrome users expect "thẻ" for a browser tab, so Dương prefers it to "tab". This conflicts with MS's "trên tab" - [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux); [MS](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf)
- "chat" is more popular than "tán gẫu" and has higher search volume; English is common in business and technology, but "Vietnamese remains the norm, nonetheless" - [AppTweak, vendor](https://www.apptweak.com/en/aso-blog/how-to-localize-your-app-in-vietnamese?format=md)

### Inferences
My judgement, for validating with real Vietnamese business users:

| Term | Recommendation | Reason |
|---|---|---|
| AI | Keep | Acronym rule; understood by the audience |
| KPI | Keep | Acronym rule; standard in Vietnamese business usage in my judgement |
| email | Keep | MS uses it; "thư điện tử" reads dated |
| CV, HR, CEO | Keep | Acronym rule |
| ID | Keep | MS lists it as modern |
| app | "ứng dụng" in UI; "app" tolerated in casual text | MS translates it in strings |
| demo | Keep in sales context ("buổi demo"); "dùng thử" for trial | Translation changes meaning; no source |
| feedback | "nhận xét" or "góp ý" for coaching; "phản hồi" for system feedback | Vietnamese is short and clear; no source |
| review | Translate by meaning: "xem lại", "đánh giá", "nhận xét" | Has several meanings; no source |
| report | "báo cáo" | |
| dashboard | "Tổng quan" or "bảng điều khiển" | "Tổng quan" is shorter |
| roleplay | "đóng vai" or "luyện tập tình huống" in plain copy; "roleplay" among trainers if users already say it | Check user vocabulary |
| coach | "huấn luyện viên" is long and sports-flavoured; test "coach" or "người hướng dẫn" | Check user vocabulary |
| deadline | "hạn" or "hạn chót" | |
| prompt | Keep for technical users; "câu lệnh" or "yêu cầu" for others | MS's audience rule |

Use Dương's Google Trends method and a controlled word list to settle these, rather than taste.

### Gaps
- No authoritative or survey source was found on how Vietnamese business users view AI, app, demo, feedback, email, KPI or review specifically. Only "email" and "ID" have direct MS support, and "app" is indirectly supported.
- The [VnExpress piece "Lạm dụng tiếng Anh"](https://vnexpress.net/lam-dung-tieng-anh-4373194.html) looks relevant to public attitudes on loanwords in Vietnamese, but the fetch was refused, so its content is unverified.
- [Microsoft Terminology](https://learn.microsoft.com/globalization/reference/microsoft-style-guides) was not queried for these terms.

## 7. Advice from Vietnamese practitioners, including MoMo, VNG, Zalo, Tiki and Shopee

### Takeaway
I found no published writing guidance or verbatim examples from MoMo, VNG, Zalo, Tiki or Shopee. The best available Vietnamese practitioner source is Thùy Dương's Great UX Writing newsletter, supplemented by a few weaker blogs.

### Cited Findings

**Thùy Dương, Great UX Writing (employer not stated in these posts)** - all verbatim pairs below are from [Dương 9 tips](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux). The labels are hers: "Hãy viết" (write) and "Thay vì" (instead of).

| Tip | Hãy viết | Thay vì |
|---|---|---|
| Read aloud | Chúng tôi không thể thực hiện giao dịch. Bạn vui lòng thử lại. | Giao dịch thất bại. Vui lòng thử lại. |
| Readability | Thông tin của bạn đã được cập nhật vào “Biểu mẫu đăng ký”. Bạn vui lòng kiểm tra và xác nhận thông tin. | Vui lòng kiểm tra lại thông tin định danh của bạn, chắc chắn rằng không có sai lệch. / Chúng tôi đã thu thập thông tin của bạn để điền vào “Mẫu đăng ký dịch vụ”. / Vui lòng kiểm tra lại, điền địa chỉ đích và ký tên ở bước sau. |
| Pronouns | Nay mưa lạnh, tặng bạn chiếc deal trà sữa giảm giá 20%. Bạn nhớ giữ ấm nha! | Bé yêu ơi! tặng bạn chiếc deal trà sữa giảm giá 20%. |
| Slang | tài khoản của bạn | tài khoản của bồ |

I confirmed the exact labels in page order only for the Read aloud, Readability and Pronouns rows. The Slang row and the two pairs below come from a summary of the page, so check direction before quoting:

- Scannability: "Xóa thư rác, tăng thêm 1GB dung lượng" over "Xóa thư mục rác để tăng thêm 1GB dung lượng".
- Benefit first, action last: "Muốn giảm cân trong vòng 30 ngày, hãy đến với chúng tôi" over "Hãy đến với chúng tôi nếu bạn muốn giảm cân trong vòng 30 ngày."

Further from Dương:
- Style guide contents and tone - [Dương style guide](https://greatuxwriting.substack.com/p/cau-truc-va-cach-viet-bo-quy-chuan): grammar sections should cover "cách xưng hô, cách viết hoa, cách sử dụng bộ dấu câu". Example of a vocabulary rule: "thoát" may replace "đăng xuất" in notifications. Brand spelling rule: "LinkedIn, không phải Linkedin".

**Minara (no named author)** - [Minara](https://vietnam.minara.vn/blogs/blog/ux-writing-nghe-thuat-thiet-ke-bang-ngon-tu)
- Examples given under question 3 and question 4. It also advises "hôm nay, ngày mai, ngày kia" for near dates and bullet points with icons rather than long paragraphs, especially for financial content.
- The same article appears on [marketingai.vn](https://marketingai.vn/ux-writing-la-gi/) per search results, so these two should not be counted as independent sources. I did not compare them line by line.

**X-Profile (Phương Nhã)** - [X-Profile](https://blog.xprofile.vn/9-nguyen-tac-toi-uu-ux-writing-cho-nguoi-moi/)
- General principles (clear, concise, useful, consistent, brand tone, empathy, error plus fix). Most examples are images, not extractable text.

**Named Vietnamese companies**
- Shopee has hired a Senior UX Content Writer in HCMC to write in-app microcopy, requiring English and Vietnamese [snippet only] - [Working In Content](https://workingincontent.com/jobs/shopee-senior-ux-content-writer-97d03a). VNG has advertised UX Writer roles [snippet only] - [Joboko](https://vn.joboko.com/viec-lam-ux-writer-xvi1342855). This shows the discipline exists there, not how they write.
- Dương's ["Tiếc cho Tiki"](https://greatuxwriting.substack.com/p/tiec-cho-tiki) sounds relevant but is a business-strategy critique with no microcopy examples.
- A Vietnamese book exists: *UX Writing - Quyền năng tối thượng của nội dung tương tác* by Khúc Cẩm Huyên [snippet only] - [LinkedIn post](https://www.linkedin.com/posts/khuc-cam-huyen-a7703835_s%C3%A1ch-ux-writing-quy%E1%BB%81n-n%C4%83ng-t%E1%BB%91i-th%C6%B0%E1%BB%A3ng-c%E1%BB%A7a-activity-6925812213215580160-JX9W). Not read.

### Inferences
- Dương and MS agree on the main points: replace "thất bại", read aloud or write as speech, keep pronouns consistent, keep "vui lòng" in messages, keep a word list.
- Dương's first example shows how much taste is in this. "Chúng tôi không thể thực hiện giao dịch" keeps Hán Việt "thực hiện" and a long subject, while MS's pattern would give something like "Không thực hiện được giao dịch." (own rendering). Both beat "thất bại". For a warm brand use hers, for a tight UI use MS's.
- Some practitioner advice is marketing-flavoured ("deal", weather greeting). It is unsuitable as is for business products.
- Much Vietnamese practitioner writing is translated English UX advice, and several pieces use English examples. Treat it as confirming general principles rather than as evidence about Vietnamese language behaviour specifically.

### Gaps
- No verbatim examples or tone rules found from MoMo, VNG, Zalo, Tiki or Shopee. They may exist on LinkedIn, Medium, closed Facebook groups or conference talks. The search tool did not surface them. Direct capture of those apps' screens would be the better evidence, and it was out of scope here.
- Dương's current employer is not established by the posts I read.

## Objective: consolidated rewrite rules

### Takeaway
Rewrite from intent, not from the English. Use a bare verb or short fragment, drop English scaffolding ("của bạn", "các", "một", "việc", "sự", "được", "đã", "sẽ"), prefer everyday words, use "bạn" or no pronoun, and write sentence case. Most rules below have direct Microsoft support; those marked own are inference.

### Cited Findings

| # | Rule | Basis | Source |
|---|---|---|---|
| 1 | Rewrite from intent; split or cut freely | Authority | [MS pp.6, 8](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 2 | Sentence case only: "Chọn tất cả" | Authority | [MS p.24](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf); [WP](https://vi.wordpress.org/style-guide-cho-dich-tieng-viet/) |
| 3 | Short everyday forms: "hủy", "nhập" | Authority | [MS p.8](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 4 | Use "Không ... được" rather than "... thất bại" | Authority | [MS pp.9, 48](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf); [Dương](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux) |
| 5 | Error plus next action | Authority and practitioner | [MS p.11](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf); [X-Profile](https://blog.xprofile.vn/9-nguyen-tac-toi-uu-ux-writing-cho-nguoi-moi/) |
| 6 | Omit "việc" before a verb; prefer verbs to verbal nouns | Authority | [MS p.42](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf); [Portland](https://termsbase.mindlinkresources.com/wp-content/uploads/sites/14/2023/11/Parks_Vietnamese_StyleGuide_FINAL.pdf) |
| 7 | Do not translate "a/an" unless it means one | Authority | [MS p.22](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 8 | Use "của" only when needed for clarity | Authority, partly inferred | [MS pp.21, 29](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 9 | Omit "đã, đang, sẽ" unless timing matters | Authority | [MS pp.29, 41](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 10 | Reduce "được/bị", but do not ban them | Authority and research | [MS p.26](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf); [Nguyen 2022](https://i-jte.org/index.php/journal/article/download/90/43/1197) |
| 11 | "Bạn nên" rather than "Chúng tôi khuyến nghị" | Authority | [MS p.6](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 12 | "Bạn" in UI; no generic "anh/chị" | Authority | [MS p.16](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 13 | "Tôi" on user's own consent | Practitioner | [Dương](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux) |
| 14 | Same word for same action; keep a word list | Practitioner | [Dương](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux) |
| 15 | No jokes when something has gone wrong | Authority and practitioner | [MS p.8](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf); [Dương](https://greatuxwriting.substack.com/p/cau-truc-va-cach-viet-bo-quy-chuan) |
| 16 | Keep acronyms in English | Authority | [MS p.20](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 17 | Northern spellings and words | Authority | [MS p.59](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) |
| 18 | Read it aloud as the final test | Practitioner | [Dương](https://greatuxwriting.substack.com/p/9-meo-cai-thien-noi-dung-ux) |

### Inferences
Own rules, not directly sourced:
- Drop "sự" and dummy verbs ("thực hiện", "tiến hành") when a plain verb exists.
- Drop plural "các" when plurality is obvious or not important.
- Use "chưa" for not-yet states and empty states.
- Keep status labels bare ("Đang xử lý", "Đã xong").
- Separate persona dialogue from UI voice in AI roleplay products.

Suggested rewrite order for a string (own method):
1. Ask what the user needs to know or do.
2. Write it as you would say it to a colleague.
3. Delete scaffolding words one by one.
4. Replace any word you wouldn't say aloud.
5. Check the term against the word list.
6. Read it aloud.

### Gaps
- All own examples in these notes, the loanword table and the Hán Việt replacement table need review by a native Vietnamese UX writer, and ideally a quick test with target users, before being treated as a standard.
- No empirical study found that measures trust or comprehension differences between translated-sounding and natural Vietnamese UI.
