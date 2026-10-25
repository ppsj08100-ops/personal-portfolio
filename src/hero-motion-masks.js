/** Pack fin, branch, and removal masks into independent channels; alpha stays zero. */
export function createSilhouettes(source, clean) {
  const width = source.naturalWidth
  const height = source.naturalHeight
  const mask = document.createElement('canvas')
  mask.width = width
  mask.height = height
  const context = mask.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Hero silhouette unavailable')
  const fin = new Path2D(`
    M190 497 C213 501 225 483 252 478
    C293 471 333 465 374 479
    C399 484 425 498 450 520
    C467 530 483 571 500 588
    C520 613 540 616 560 622 C571 626 579 628 585 629
    L585 638 C551 638 527 642 507 650 C483 658 462 670 432 672
    C379 675 333 669 289 670 C253 671 232 667 215 666
    C233 662 250 640 268 621 C288 602 307 591 327 592
    C312 584 300 571 293 556 C283 528 264 510 241 503
    C222 496 204 503 190 497 Z
  `)
  context.scale(width / 1672, height / 941)
  context.fillStyle = '#fff'
  context.strokeStyle = '#fff'
  // Include the silver contour around both lobes, including the inner
  // crescent. A tight path left these strokes behind when the fin moved.
  context.lineWidth = 12
  // Miter joins at the pointed tip reached x152 and picked up the adjacent
  // rock, even though the actual fin begins at x190.
  context.lineJoin = 'round'
  context.fill(fin)
  context.stroke(fin)
  const finPixels = context.getImageData(0, 0, width, height).data
  context.clearRect(0, 0, 1672, 941)
  const plants = new Path2D(`
    M0 295 L34 295 C44 329 61 330 69 343 C110 356 132 388 141 439
    L135 500 L84 523 L61 489 L11 472 L0 433 Z
    M1590 382 L1672 382 L1672 617 L1568 609 L1534 568 L1544 518 L1582 488 Z
    M1650 633 L1672 633 L1672 832 L1526 832 L1500 787 L1535 745 L1573 719 L1580 659 Z
  `)
  context.fill(plants)
  const plantRegions = context.getImageData(0, 0, width, height).data
  context.clearRect(0, 0, 1672, 941)
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)
  const original = context.getImageData(0, 0, width, height).data
  context.clearRect(0, 0, width, height)
  context.drawImage(clean, 0, 0, width, height)
  const background = context.getImageData(0, 0, width, height).data
  const pixels = new Uint8Array(width * height * 4)
  const clamp = value => Math.min(1, Math.max(0, value))
  // The fin is only one to eight pixels thick near its left tip. Trim the
  // rounded stroke's water padding using the real ink against the clean
  // plate; this preserves its silver outline without carrying a water chip.
  const tipLeft = Math.max(0, Math.floor(183 * width / 1672))
  const tipRight = Math.min(width, Math.ceil(218 * width / 1672))
  const tipTop = Math.max(0, Math.floor(480 * height / 941))
  const tipBottom = Math.min(height, Math.ceil(520 * height / 941))
  for (let y = tipTop; y < tipBottom; y++) {
    for (let x = tipLeft; x < tipRight; x++) {
      const index = (y * width + x) * 4
      if (!finPixels[index + 3]) continue
      if ((x + 0.5) * 1672 / width < 190) {
        finPixels[index + 3] = 0
        continue
      }
      const light = original[index] * 0.2126 + original[index + 1] * 0.7152
        + original[index + 2] * 0.0722
      const behind = background[index] * 0.2126 + background[index + 1] * 0.7152
        + background[index + 2] * 0.0722
      const ink = clamp((light - 25) / 30) * clamp((light - behind - 6) / 18)
      // Restore the original broad mask smoothly where the fin thickens.
      const blend = clamp(((x + 0.5) * 1672 / width - 210) / 8)
      const support = ink + (1 - ink) * blend * blend * (3 - 2 * blend)
      finPixels[index + 3] = Math.round(finPixels[index + 3] * support)
    }
  }
  const finLeft = Math.floor(184 * width / 1672)
  const finRight = Math.ceil(590 * width / 1672)
  const finTop = Math.floor(461 * height / 941)
  const finBottom = Math.ceil(680 * height / 941)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      pixels[index] = finPixels[index + 3]
      // A one-pixel removal margin prevents a stationary pale fringe when the
      // antialiased edge moves. The moving image itself uses the tight mask.
      let removal = pixels[index]
      if (removal < 255 && x >= finLeft && x <= finRight && y >= finTop && y <= finBottom) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighbour = ((Math.min(height - 1, Math.max(0, y + dy)) * width)
              + Math.min(width - 1, Math.max(0, x + dx))) * 4 + 3
            removal = Math.max(removal, finPixels[neighbour])
          }
        }
      }
      pixels[index + 2] = removal
      if (plantRegions[index + 3]) {
        const r = original[index]
        const g = original[index + 1]
        const b = original[index + 2]
        const light = r * 0.2126 + g * 0.7152 + b * 0.0722
        const behind = background[index] * 0.2126 + background[index + 1] * 0.7152 + background[index + 2] * 0.0722
        // The silver branch ink is paler and less saturated than the blue rock
        // outlines. A clean-plate comparison rejects unchanged highlights.
        const ink = clamp((light - 58) / 22)
          * clamp((r / Math.max(1, b) - 0.38) / 0.13)
          * clamp((light - behind - 10) / 18)
        pixels[index + 1] = Math.round(255 * ink * plantRegions[index + 3] / 255)
      }
      pixels[index + 3] = 0
    }
  }
  return { width, height, pixels }
}

/** R is open water; G is water directly below the forearm and fingers. */
export function createWaterMask(source) {
  const width = source.naturalWidth
  const height = source.naturalHeight
  if (!width || !height) throw new Error('Hero water matte unavailable')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Hero water matte unavailable')
  context.scale(width / 1672, height / 941)
  context.fillStyle = '#fff'
  context.fillRect(0, 0, 1672, 454)

  // This is the complete outside silhouette, including the scales between
  // the fin and torso, the face, hands, and every curl resting on the sea.
  const figure = new Path2D(`
    M190 497 C213 501 225 483 252 478
    C293 471 333 465 374 479 C399 484 425 498 450 520
    C467 530 483 571 500 588 C520 613 540 616 560 622
    C610 615 650 584 704 562 C742 545 779 547 814 558
    C833 562 846 569 856 574 C878 564 891 543 900 523
    C912 498 931 489 949 498 C968 503 983 516 997 517
    L1005 508 C994 502 988 490 991 480 L987 470 L996 459
    C1004 438 1010 417 1025 405 C1027 391 1050 391 1070 400
    C1098 401 1121 416 1135 441 C1143 451 1135 463 1153 474
    C1171 488 1167 514 1188 533 C1206 549 1209 576 1239 586
    C1260 592 1273 600 1285 616 C1320 622 1338 641 1365 649
    C1386 647 1402 655 1415 666 C1435 676 1452 670 1458 685
    L1458 704 C1418 711 1380 701 1357 704
    C1319 709 1289 699 1261 703 C1229 705 1195 697 1165 702
    C1137 706 1108 700 1082 701 C1050 693 1018 694 985 689
    C940 689 897 689 857 679 C802 675 723 674 650 673
    L500 673 C479 674 455 676 432 672
    C379 675 333 669 289 670 C253 671 232 667 215 666
    C233 662 250 640 268 621 C288 602 307 591 327 592
    C312 584 300 571 293 556 C283 528 264 510 241 503
    C222 496 204 503 190 497 Z
  `)
  const leftShore = new Path2D(`
    M0 285 L144 285 L144 449 L157 466
    C177 469 187 493 190 512 C212 512 231 535 240 554
    L247 565 L0 577 Z
  `)
  const rightIsland = new Path2D(`
    M1580 366 L1672 366 L1672 638 L1600 632
    C1555 631 1511 628 1452 620 L1454 608
    C1465 586 1491 579 1513 558 C1536 547 1540 520 1565 502
    L1571 453 L1574 402 Z
  `)
  const foregroundIsland = new Path2D(`
    M1570 624 L1672 624 L1672 850
    C1600 851 1518 838 1440 813 L1444 796
    C1455 776 1468 755 1492 741 C1508 722 1533 709 1555 703
    L1558 670 Z
  `)
  ;[figure, leftShore, rightIsland, foregroundIsland].forEach(path => context.fill(path))
  const protectedPixels = context.getImageData(0, 0, width, height).data

  // A distance transform keeps the whole safety margin opaque. Feathering
  // starts only beyond that margin on the water side, unlike a blurred mask
  // which can partially reopen pixels belonging to a rock or a hair strand.
  const distance = new Uint16Array(width * height)
  const far = 32767
  for (let i = 0; i < distance.length; i++) {
    distance[i] = protectedPixels[i * 4 + 3] ? 0 : far
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      let value = distance[i]
      if (!value) continue
      if (x) value = Math.min(value, distance[i - 1] + 3)
      if (y) {
        value = Math.min(value, distance[i - width] + 3)
        if (x) value = Math.min(value, distance[i - width - 1] + 4)
        if (x + 1 < width) value = Math.min(value, distance[i - width + 1] + 4)
      }
      distance[i] = value
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x
      let value = distance[i]
      if (!value) continue
      if (x + 1 < width) value = Math.min(value, distance[i + 1] + 3)
      if (y + 1 < height) {
        value = Math.min(value, distance[i + width] + 3)
        if (x) value = Math.min(value, distance[i + width - 1] + 4)
        if (x + 1 < width) value = Math.min(value, distance[i + width + 1] + 4)
      }
      distance[i] = value
    }
  }
  const pixels = new Uint8Array(width * height * 4)
  const scale = Math.min(width / 1672, height / 941)
  const safety = 8 * scale
  const feather = 6 * scale
  // Sampled from the original forearm's lower silver contour, then the
  // lowest finger pads. The right taper ends before the hair at x1150.
  const armUnderside = [
    [835, 676], [848, 679], [858, 682], [880, 684], [910, 686],
    [940, 686], [970, 685], [995, 685], [1007, 687], [1020, 690],
    [1047, 690], [1057, 692], [1075, 695], [1084, 695], [1095, 695],
    [1106, 694], [1116, 692], [1128, 691], [1140, 691],
  ]
  const smooth = amount => {
    const bounded = Math.min(1, Math.max(0, amount))
    return bounded * bounded * (3 - 2 * bounded)
  }
  const contactColumns = new Float32Array(width)
  contactColumns.fill(-1)
  let segment = 0
  for (let x = Math.max(0, Math.floor(835 * width / 1672)); x < width; x++) {
    const referenceX = (x + 0.5) * 1672 / width
    if (referenceX >= 1140) break
    while (segment + 1 < armUnderside.length - 1
      && referenceX > armUnderside[segment + 1][0]) segment++
    const left = armUnderside[segment]
    const right = armUnderside[segment + 1]
    const fraction = (referenceX - left[0]) / (right[0] - left[0])
    contactColumns[x] = left[1] + (right[1] - left[1]) * fraction
  }
  for (let i = 0; i < distance.length; i++) {
    const amount = Math.min(1, Math.max(0, (distance[i] / 3 - safety) / feather))
    pixels[i * 4] = Math.round(255 * amount * amount * (3 - 2 * amount))
    pixels[i * 4 + 3] = 255
  }
  const contactTop = Math.max(0, Math.floor(682 * height / 941))
  const contactBottom = Math.min(height, Math.ceil(745 * height / 941))
  const contactLeft = Math.max(0, Math.floor(835 * width / 1672))
  const contactRight = Math.min(width, Math.ceil(1140 * width / 1672))
  for (let y = contactTop; y < contactBottom; y++) {
    const referenceY = (y + 0.5) * 941 / height
    const bottomFade = 1 - smooth((referenceY - 718) / 27)
    for (let x = contactLeft; x < contactRight; x++) {
      const referenceX = (x + 0.5) * 1672 / width
      const boundary = contactColumns[x]
      if (boundary < 0) continue
      const belowArm = smooth((referenceY - boundary - 2) / 3)
      const sideFade = smooth((referenceX - 835) / 20)
        * (1 - smooth((referenceX - 1110) / 30))
      pixels[(y * width + x) * 4 + 1] = Math.round(255 * belowArm * sideFade * bottomFade)
    }
  }
  return { width, height, pixels }
}
