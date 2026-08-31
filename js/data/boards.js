// Board content aligned to the latest supplied Bingo A/B/C artwork.
// Array order is row-major (left-to-right, top-to-bottom) for the 5x5 activity grid.
// Each activity tuple is: [name, target/points label, icon, color class, modal target].
// Quiz ITGH is rendered separately by index.html and is intentionally not included here.
export const BOARDS = {
  A: [
    ["Tenis Meja","≥60 mnt (2p)","🏓","red","≥ 60 menit"],
    ["Tenis/Padel","≥30 mnt (2p)","🎾","orange","≥ 30 menit"],
    ["Lari","+=20 km (3p)","🏃","blue","+= 20 KM"],
    ["Basket","≥30 mnt (2p)","🏀","orange","≥ 30 menit"],
    ["Jalan Pagi","≥5 km (3p)","🚶","orange","≥ 5 KM"],

    ["Lari","≥3 km (3p)","🏃","orange","≥ 3 KM"],
    ["Tanam Pohon","(5p)","🌱","red","5 poin"],
    ["Jalan Sore","+=10 km (3p)","🚶","red","+= 10 KM"],
    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],
    ["Berenang","≥30 mnt (2p)","🏊","orange","≥ 30 menit"],

    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],
    ["Voli","≥30 mnt (2p)","🏐","orange","≥ 30 menit"],
    ["Foto Bersama","(5p)","⭐","orange","5 poin"],
    ["Lari","+=15 km (3p)","🏃","red","+= 15 KM"],
    ["Jalan Pagi","+=10 km (3p)","🚶","red","+= 10 KM"],

    ["Bowling","≥30 mnt (2p)","🎳","orange","≥ 30 menit"],
    ["Bulu Tangkis","≥60 mnt (2p)","🏸","red","≥ 60 menit"],
    ["Yoga/Pilates","≥30 mnt (3p)","🧘","orange","≥ 30 menit"],
    ["Tenis Meja","≥30 mnt (2p)","🏓","orange","≥ 30 menit"],
    ["Jalan Sore","≥5 km (3p)","🚶","orange","≥ 5 KM"],

    ["Senam","≥30 mnt (3p)","🤸","orange","≥ 30 menit"],
    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],
    ["Angkat Beban","≥30 mnt (3p)","🏋️","orange","≥ 30 menit"],
    ["Bulu Tangkis","≥30 mnt (2p)","🏸","orange","≥ 30 menit"],
    ["Bersepeda","≥5 km (3p)","🚴","orange","≥ 5 KM"]
  ],

  B: [
    ["Tenis Meja","≥30 mnt (2p)","🏓","orange","≥ 30 menit"],
    ["Senam","≥30 mnt (3p)","🤸","orange","≥ 30 menit"],
    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],
    ["Lari","≥3 km (3p)","🏃","orange","≥ 3 KM"],
    ["Jalan Pagi","+=10 km (3p)","🚶","red","+= 10 KM"],

    ["Jalan Sore","≥5 km (3p)","🚶","orange","≥ 5 KM"],
    ["Tenis Meja","≥60 mnt (2p)","🏓","red","≥ 60 menit"],
    ["Tanam Pohon","(5p)","🌱","red","5 poin"],
    ["Voli","≥30 mnt (2p)","🏐","orange","≥ 30 menit"],
    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],

    ["Angkat Beban","≥30 mnt (3p)","🏋️","orange","≥ 30 menit"],
    ["Tenis/Padel","≥30 mnt (2p)","🎾","orange","≥ 30 menit"],
    ["Foto Bersama","(5p)","⭐","orange","5 poin"],
    ["Bowling","≥30 mnt (2p)","🎳","orange","≥ 30 menit"],
    ["Lari","+=20 km (3p)","🏃","blue","+= 20 KM"],

    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],
    ["Yoga/Pilates","≥30 mnt (3p)","🧘","orange","≥ 30 menit"],
    ["Bulu Tangkis","≥60 mnt (2p)","🏸","red","≥ 60 menit"],
    ["Jalan Sore","+=10 km (3p)","🚶","red","+= 10 KM"],
    ["Berenang","≥30 mnt (2p)","🏊","orange","≥ 30 menit"],

    ["Lari","+=15 km (3p)","🏃","red","+= 15 KM"],
    ["Jalan Pagi","≥5 km (3p)","🚶","orange","≥ 5 KM"],
    ["Bersepeda","≥5 km (3p)","🚴","orange","≥ 5 KM"],
    ["Bulu Tangkis","≥30 mnt (2p)","🏸","orange","≥ 30 menit"],
    ["Basket","≥30 mnt (2p)","🏀","orange","≥ 30 menit"]
  ],

  C: [
    ["Jalan Pagi","+=10 km (3p)","🚶","red","+= 10 KM"],
    ["Bowling","≥30 mnt (2p)","🎳","orange","≥ 30 menit"],
    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],
    ["Tenis/Padel","≥30 mnt (2p)","🎾","orange","≥ 30 menit"],
    ["Jalan Pagi","≥5 km (3p)","🚶","orange","≥ 5 KM"],

    ["Basket","≥30 mnt (2p)","🏀","orange","≥ 30 menit"],
    ["Voli","≥30 mnt (2p)","🏐","orange","≥ 30 menit"],
    ["Yoga/Pilates","≥30 mnt (3p)","🧘","orange","≥ 30 menit"],
    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],
    ["Bersepeda","≥5 km (3p)","🚴","orange","≥ 5 KM"],

    ["Tenis Meja","≥60 mnt (2p)","🏓","red","≥ 60 menit"],
    ["Jalan Sore","+=10 km (3p)","🚶","red","+= 10 KM"],
    ["Foto Bersama","(5p)","⭐","orange","5 poin"],
    ["Tanam Pohon","(5p)","🌱","red","5 poin"],
    ["Lari","+=15 km (3p)","🏃","red","+= 15 KM"],

    ["Bulu Tangkis","≥30 mnt (2p)","🏸","orange","≥ 30 menit"],
    ["Olahraga Bebas","≥30 mnt (4p)","🏀","blue","≥ 30 menit"],
    ["Lari","≥3 km (3p)","🏃","orange","≥ 3 KM"],
    ["Tenis Meja","≥30 mnt (2p)","🏓","orange","≥ 30 menit"],
    ["Jalan Sore","≥5 km (3p)","🚶","orange","≥ 5 KM"],

    ["Angkat Beban","≥30 mnt (3p)","🏋️","orange","≥ 30 menit"],
    ["Berenang","≥30 mnt (2p)","🏊","orange","≥ 30 menit"],
    ["Lari","+=20 km (3p)","🏃","blue","+= 20 KM"],
    ["Senam","≥30 mnt (3p)","🤸","orange","≥ 30 menit"],
    ["Bersepeda","+=20 km (3p)","🚴","red","+= 20 KM"]
  ]
};

export const WEEKS = [
  { id:1, label:"Minggu 1", date:"31 Agustus – 6 September 2026" },
  { id:2, label:"Minggu 2", date:"7 – 13 September 2026" },
  { id:3, label:"Minggu 3", date:"14 – 20 September 2026" },
  { id:4, label:"Minggu 4", date:"21 – 27 September 2026" }
];
