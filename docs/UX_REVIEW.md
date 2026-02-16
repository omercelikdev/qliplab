# qliplab UX Review & Feature Recommendations

> Tarih: 2026-02-16
> Kapsam: Tüm kullanıcı akışları, etkileşim kalıpları, rakip karşılaştırma

---

## Genel Değerlendirme

Uygulama teknik olarak çok güçlü — transform pipeline, AI entegrasyonu, format auto-detection gibi özellikler rakiplerin önünde. Ancak bazı akışlar "developer için developer" hissiyatı veriyor. Aşağıdaki öneriler, uygulamayı **herkesin rahatça kullanabileceği** seviyeye çıkarmayı hedefliyor.

---

## A. Kafa Karıştıran Akışlar & Çözümler

### 1. Preview Açılma Akışı — Belirsiz Tetikleyiciler

**Sorun:** Preview panel 3 farklı yoldan açılıyor ama kullanıcı hangisinin ne yaptığını anlayamıyor:
- Eye butonu → View mode (read-only)
- Menüden transform → Transform mode (editable)
- Option+D + 2 item seç → Diff mode

**Öneri:**
- Eye butonuna **tooltip** ekle: "View (read-only)"
- 3-dot menüdeki transform aksiyonlarına kısa açıklama ekle (şu an sadece "Beautify", "Decode" yazıyor — ne olacağı belli değil)
- Diff mode için **ilk kullanımda** küçük bir toast/banner göster: "Select 2 items to compare"

### 2. Menü Keşfedilebilirliği — Hover-Only Sorun

**Sorun:** Eye ve 3-dot butonları sadece hover'da görünüyor. Mobil/trackpad kullanıcılar bunları hiç görmeyebilir. Yeni kullanıcı "bu item'a ne yapabilirim?" diye düşünebilir.

**Öneri:**
- Seçili item'ın (keyboard nav ile) butonlarını **her zaman göster**
- Veya: sağ-tık context menu desteği ekle (natif his verir)

### 3. Snippet Düzenleme — Yok

**Sorun:** Snippet oluşturduktan sonra düzenleyemiyorsun. Tek seçenek silip yeniden oluşturmak.

**Öneri:** Snippet'e tıklayınca paste yerine **önce preview'da göster**, oradan Edit/Paste seçeneği sun. Veya: long-press / double-click = edit.

### 4. Vault İlk Kullanım — Rehbersiz

**Sorun:** Vault'a ilk girişte şifre oluşturma ekranı çıkıyor ama neden şifre gerektiği, ne saklanacağı, ne kadar güvenli olduğu anlatılmıyor.

**Öneri:** İlk kullanımda 2-3 cümlelik bir açıklama:
> "Vault, hassas verilerinizi (kartlar, PIN'ler, IBAN'lar) AES-256 ile şifreleyerek saklar. Şifrenizi unutursanız verilerinize erişemezsiniz."

### 5. Silme İşlemleri — Geri Alınamaz

**Sorun:** Snippet ve vault item silme işlemlerinde **onay dialogu yok**. Yanlış tıklama = kayıp.

**Öneri:** En azından vault item'lar için onay dialogu. History için undo toast (3 saniye geri alma süresi).

---

## B. Eksik Temel Özellikler (Rakiplerde Var)

### 6. Pinned Items Bölümü

**Sorun:** Pin'lenmiş item'lar liste içinde karışık duruyor. Kullanıcı "pinledim ama nerede?" der.

**Öneri:** History listesinin en üstünde ayrı bir "Pinned" bölümü, ince bir separator ile:
```
📌 Pinned
  item 1
  item 2
─────────
  Recent
  item 3
  item 4
```

### 7. Menu Bar İkonu (macOS Tray)

**Sorun:** Uygulama sadece Cmd+Shift+V ile açılıyor. Menu bar'da göstergesi yok. Kullanıcı "çalışıyor mu?" diye merak eder.

**Öneri:** Menu bar icon ekle — tıklayınca pencereyi toggle etsin. Maccy, Paste, CopyClip hepsi bunu yapıyor. Tauri v2'de `tray_icon` plugin'i ile mümkün.

### 8. Arama Sonuçlarında Highlight

**Sorun:** Fuzzy search çalışıyor ama eşleşen karakterler highlight edilmiyor. Kullanıcı "neden bu sonuç çıktı?" diye düşünür.

**Öneri:** `fuzzySearch.ts` zaten pozisyon bilgisi döndürebilir. Eşleşen karakterleri `<mark>` ile sarmalayarak göster.

### 9. Source App Gösterimi

**Sorun:** `source_app` database'de saklanıyor ama UI'da hiç gösterilmiyor.

**Öneri:** History item'da küçük bir app icon/label göster: "from Chrome", "from VS Code". Bu, kullanıcının hangi kopyayı aradığını hızlıca bulmasını sağlar.

---

## C. Kullanıcı Deneyimi İyileştirmeleri

### 10. Onboarding / İlk Kullanım

**Sorun:** Uygulama ilk açıldığında sadece boş bir liste var. Kullanıcı ne yapacağını bilmiyor.

**Öneri:** İlk kullanımda minimal bir welcome:
- "Copy anything — it appears here automatically"
- "Press Enter to paste, ⌥D to compare"
- "Try the ⋮ menu for transforms"

3-4 kullanımdan sonra otomatik kaybolsun.

### 11. Format Badge Listede Göster

**Sorun:** Item'ın formatı sadece menüden veya preview'dan anlaşılıyor. Listede sadece küçük bir ikon var, çoğu zaman "plain text" ikonu.

**Öneri:** JSON, JWT, Base64 gibi önemli formatlar için item'ın yanında küçük bir badge göster (şu an HTML badge'i gibi). Kullanıcı hangi item'ın ne olduğunu anında görür.

### 12. Keyboard Shortcut Hints

**Sorun:** Kullanıcı Option+D, ESC, Enter gibi kısayolları HintBar'dan öğrenmek zorunda. HintBar çok küçük ve gözden kaçıyor.

**Öneri:**
- Menü aksiyonlarının yanına kısayol göster (varsa)
- İlk birkaç kullanımda HintBar'ı biraz daha belirgin yap (pulse animation?)

### 13. Quick Actions — Sağ-Tık / Swipe

**Sorun:** Her şey hover → 3-dot menü → seç akışında. Bu 3 adım.

**Öneri:** En sık kullanılan aksiyonlar için kısayollar:
- **Sağ-tık** = context menu (natif his)
- **Swipe left** (trackpad) = delete
- **Swipe right** = pin/unpin

### 14. Snippet Kategorileri

**Sorun:** Snippet'lerde kategori desteği DB'de var (`category_id`) ama UI'da yok. Tüm snippet'ler düz liste.

**Öneri:** Basit folder/tag sistemi. "Work", "Code", "Personal" gibi. Sidebar'da veya filter bar'da.

---

## D. "Wow" Efekti Yaratacak Özellikler

### 15. Smart Paste (Akıllı Yapıştırma)

Kopyalanan içeriği hedef uygulamaya göre otomatik dönüştür:
- JSON kopyala → Excel'e yapıştır = otomatik tablo
- URL kopyala → Markdown editöre yapıştır = `[title](url)` formatı
- Renk kodu kopyala → Figma'ya yapıştır = doğru format

### 16. Clipboard Sync (iCloud/Local Network)

Cihazlar arası senkronizasyon. En azından aynı ağdaki Mac'ler arası.

### 17. Quick Preview (Space Bar)

macOS Finder'daki Quick Look gibi: Space'e basınca item'ın büyük önizlemesi görünsün, bırakınca kapansın. Preview panel açmadan hızlı bakış.

### 18. Favorites / Collections

Kullanıcının kendi koleksiyonlarını oluşturabilmesi:
- "API Keys" koleksiyonu
- "Code Snippets" koleksiyonu
- "Addresses" koleksiyonu
- Drag & drop ile item ekleme

---

## E. Rakip Karşılaştırma Özet

| Özellik | qliplab | Maccy | Paste | Raycast | Ditto |
|---------|---------|-------|-------|---------|-------|
| Transform Pipeline | ✅ Lider | ❌ | ❌ | Basit | ❌ |
| AI Actions | ✅ Lider | ❌ | ❌ | ❌ | ❌ |
| Format Detection | ✅ 29+ format | ❌ | Basit | Basit | ❌ |
| Secure Vault | ✅ | ❌ | ❌ | ❌ | ❌ |
| Monaco Editor | ✅ | ❌ | ❌ | ❌ | ❌ |
| Diff Mode | ✅ | ❌ | ❌ | ❌ | ❌ |
| OCR | ✅ | ❌ | ❌ | ✅ | ❌ |
| Menu Bar Icon | ❌ | ✅ | ✅ | ✅ | ✅ |
| iCloud Sync | ❌ | ❌ | ✅ | ❌ | ❌ |
| Onboarding | ❌ | ❌ | ✅ | ✅ | ❌ |
| Search Highlight | ❌ | ✅ | ✅ | ✅ | ✅ |
| Pinned Section | ❌ | ❌ | ✅ | ❌ | ✅ |
| Right-Click Menu | ❌ | ✅ | ✅ | ✅ | ✅ |
| Snippet Edit | ❌ | N/A | N/A | ✅ | ❌ |

**qliplab'ın benzersiz güçlü yanları:** Transform pipeline, AI, Vault, Diff, Format detection, OCR
**Kapatılması gereken boşluklar:** Menu bar icon, onboarding, search highlight, pinned section

---

## F. Öncelik Sıralaması

### Must Have (Store Yayını İçin)
1. Menu bar tray icon
2. Pinned items bölümü
3. Silme onay dialogları (vault)
4. İlk kullanım rehberi (minimal onboarding)
5. Snippet düzenleme

### Should Have (İlk Güncelleme)
6. Search highlight
7. Source app gösterimi
8. Format badge listede
9. Sağ-tık context menu
10. Keyboard shortcut tooltips

### Nice to Have (Gelecek)
11. Quick Look (Space bar preview)
12. Snippet kategorileri
13. Export/Import
14. Smart Paste
15. Clipboard sync

---

## G. Mevcut Güçlü Yanlar (Dokunma!)

Bu özellikler rakiplerden ayrıştırıyor, korunmalı:
- ✅ Transform pipeline + context-aware picker — endüstri lideri
- ✅ AI entegrasyonu + güvenlik kontrolleri — benzersiz
- ✅ Format auto-detection (29+ format) — en kapsamlı
- ✅ Vault (AES-256-GCM + brute force koruması) — güvenlik odaklı
- ✅ Monaco editor + diff view — developer heaven
- ✅ Ditto-like paste (önceki uygulamaya otomatik yapıştırma)
- ✅ Rich text + HTML + Markdown desteği
- ✅ OCR from images
