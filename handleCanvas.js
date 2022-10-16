const { createCanvas, Image } = require('canvas')
const canvas = createCanvas(47, 155)
const ctx = canvas.getContext('2d')

const canvas1 = createCanvas(310, 155)
const ctx1 = canvas1.getContext('2d')


const sideLeft = 18 // 副图对比区域坐标
const sideTop = 14 // 副图对比区域坐标
const diffW = 10 // 对比区域
const diffH = 15 // 对比区域
const mainImageX = 4  // 主图

const subWidth = 47
const subHeight = 155
const mainWidth = 310

let subPosLeft = 0

function createImg (base64) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = function () {
            resolve(img)
        }
        img.src = base64
    })
}

async function getImagePos (subDataBase64, mainDataBase64) {
    // console.log('开始处理图片')
    // console.log(subDataBase64, mainDataBase64)
    const { startX, endX } = await getPos(subDataBase64)
    // console.log(startX, endX)
    
    // 绘制主图
    await drawMainImage(startX, endX, mainDataBase64)

    // 对比图片
    matchParameter(startX, mainImageX, mainWidth - subWidth + sideLeft - mainImageX)
    
    // console.log('对比结果：', subPosLeft)
    return subPosLeft
}

// 获取 y 坐标
async function getPos (subDataBase64) {
    const img = await createImg(subDataBase64)
    
    ctx.drawImage(img, 0, 0)

    let data = ctx.getImageData(0, 0, subWidth, subHeight).data;//读取整张图片的像素。
    let x = 0, y = 0, startX = 0, endX = 0;

    for (let i = 0, len = data.length; i < len; i += 4) {
        let red = data[i],//红色色深
            green = data[i + 1],//绿色色深
            blue = data[i + 2],//蓝色色深
            alpha = data[i + 3];//透明度
        //把每个像素点，以二位数组的形式展开
        if (`${red} ${green} ${blue}` === '255 255 255') {
            endX = y
            if (startX === 0) startX = y
        }
        x++;
        if (x >= subWidth) {
            x = 0;
            y++;
        }
    }
    return {
        startX, endX
    }
}

// 根据 y 坐标绘制局部图片
async function drawMainImage (startX, endX, mainDataBase64) {
    const h = endX - startX

    const img = await createImg(mainDataBase64)
    
    ctx1.drawImage(img, 0, startX, mainWidth, h, 0, 0, mainWidth, h)
}

// 获取两图片像素对比
function matchParameter (startX, x, w) {
    if (x > w) return console.log('超出边界', w)

    const ctxImgData = ctx.getImageData(sideLeft, startX + sideTop, diffW, diffH)
    // console.log(ctxImgData)
    // 模糊图片
    const newCtxImgData = stackBlurCanvasRGBA(ctxImgData, ctxImgData.width, ctxImgData.height, 2)
    // ctx2.putImageData(newCtxImgData, 0, 0, 0, 0, 100, 100)

    const ctx3ImgData = ctx1.getImageData(x, sideTop, diffW, diffH)
    // console.log(ctx3ImgData)
    // ctx3.putImageData(ctx3ImgData, 0, 0, 0, 0, 100, 100)

    try {
        // 对比图片
        let flag = true
        for (let i = 0, len = newCtxImgData.data.length; i < len; i += 4) {
            let red = newCtxImgData.data[i],//红色色深
                green = newCtxImgData.data[i + 1],//绿色色深
                blue = newCtxImgData.data[i + 2],//蓝色色深
                alpha = newCtxImgData.data[i + 3];//透明度
            let red1 = ctx3ImgData.data[i],//红色色深
                green1 = ctx3ImgData.data[i + 1],//绿色色深
                blue1 = ctx3ImgData.data[i + 2],//蓝色色深
                alpha1 = ctx3ImgData.data[i + 3];//透明度
            
            // 10：一样
            // 11-49：相似
            const result = deltaE([red, green, blue], [red1, green1, blue1]) 
            // console.log(result)
            if (result > 20) {
                flag = false
            }
        }
        // console.log('图案对比结果', x, flag)
        if (flag) {
            subPosLeft = x - 6
            // console.log('图案是否一致', subPosLeft)
        } else {
            matchParameter (startX, x + 1, w)
        }
                
    } catch (error) {
        console.log(error)
    }

}

// 对比颜色 
function deltaE(rgbA, rgbB) {
    let labA = rgb2lab(rgbA);
    let labB = rgb2lab(rgbB);
    let deltaL = labA[0] - labB[0];
    let deltaA = labA[1] - labB[1];
    let deltaB = labA[2] - labB[2];
    let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    let deltaC = c1 - c2;
    let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    let sc = 1.0 + 0.045 * c1;
    let sh = 1.0 + 0.015 * c1;
    let deltaLKlsl = deltaL / (1.0);
    let deltaCkcsc = deltaC / (sc);
    let deltaHkhsh = deltaH / (sh);
    let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
}

function rgb2lab(rgb){
    let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}

// 高斯模糊图片像素
var mul_table = [512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512, 454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512, 482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456, 437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512, 497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328, 320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456, 446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335, 329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512, 505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405, 399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328, 324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271, 268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456, 451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388, 385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335, 332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292, 289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259];
var shg_table = [9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24];
function stackBlurCanvasRGBA(imageData, width, height, radius) {
    if (isNaN(radius) || radius < 1) return;
    radius |= 0;

    var pixels = imageData.data;

    var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum, r_out_sum, g_out_sum, b_out_sum, a_out_sum, r_in_sum, g_in_sum, b_in_sum, a_in_sum, pr, pg, pb, pa, rbs;

    var div = radius + radius + 1;
    var w4 = width << 2;
    var widthMinus1 = width - 1;
    var heightMinus1 = height - 1;
    var radiusPlus1 = radius + 1;
    var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

    var stackStart = new BlurStack();
    var stack = stackStart;
    for (i = 1; i < div; i++) {
        stack = stack.next = new BlurStack();
        if (i == radiusPlus1) var stackEnd = stack;
    }
    stack.next = stackStart;
    var stackIn = null;
    var stackOut = null;

    yw = yi = 0;

    var mul_sum = mul_table[radius];
    var shg_sum = shg_table[radius];

    for (y = 0; y < height; y++) {
        r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;

        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
        a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;
        a_sum += sumFactor * pa;

        stack = stackStart;

        for (i = 0; i < radiusPlus1; i++) {
        stack.r = pr;
        stack.g = pg;
        stack.b = pb;
        stack.a = pa;
        stack = stack.next;
        }

        for (i = 1; i < radiusPlus1; i++) {
        p = yi + ((widthMinus1 < i ? widthMinus1: i) << 2);
        r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
        g_sum += (stack.g = (pg = pixels[p + 1])) * rbs;
        b_sum += (stack.b = (pb = pixels[p + 2])) * rbs;
        a_sum += (stack.a = (pa = pixels[p + 3])) * rbs;

        r_in_sum += pr;
        g_in_sum += pg;
        b_in_sum += pb;
        a_in_sum += pa;

        stack = stack.next;
        }

        stackIn = stackStart;
        stackOut = stackEnd;
        for (x = 0; x < width; x++) {
        pixels[yi + 3] = pa = (a_sum * mul_sum) >> shg_sum;
        if (pa != 0) {
            pa = 255 / pa;
            pixels[yi] = ((r_sum * mul_sum) >> shg_sum) * pa;
            pixels[yi + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
            pixels[yi + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
        } else {
            pixels[yi] = pixels[yi + 1] = pixels[yi + 2] = 0;
        }

        r_sum -= r_out_sum;
        g_sum -= g_out_sum;
        b_sum -= b_out_sum;
        a_sum -= a_out_sum;

        r_out_sum -= stackIn.r;
        g_out_sum -= stackIn.g;
        b_out_sum -= stackIn.b;
        a_out_sum -= stackIn.a;

        p = (yw + ((p = x + radius + 1) < widthMinus1 ? p: widthMinus1)) << 2;

        r_in_sum += (stackIn.r = pixels[p]);
        g_in_sum += (stackIn.g = pixels[p + 1]);
        b_in_sum += (stackIn.b = pixels[p + 2]);
        a_in_sum += (stackIn.a = pixels[p + 3]);

        r_sum += r_in_sum;
        g_sum += g_in_sum;
        b_sum += b_in_sum;
        a_sum += a_in_sum;

        stackIn = stackIn.next;

        r_out_sum += (pr = stackOut.r);
        g_out_sum += (pg = stackOut.g);
        b_out_sum += (pb = stackOut.b);
        a_out_sum += (pa = stackOut.a);

        r_in_sum -= pr;
        g_in_sum -= pg;
        b_in_sum -= pb;
        a_in_sum -= pa;

        stackOut = stackOut.next;

        yi += 4;
        }
        yw += width;
    }

    for (x = 0; x < width; x++) {
        g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;

        yi = x << 2;
        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
        a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;
        a_sum += sumFactor * pa;

        stack = stackStart;

        for (i = 0; i < radiusPlus1; i++) {
        stack.r = pr;
        stack.g = pg;
        stack.b = pb;
        stack.a = pa;
        stack = stack.next;
        }

        yp = width;

        for (i = 1; i <= radius; i++) {
        yi = (yp + x) << 2;

        r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
        g_sum += (stack.g = (pg = pixels[yi + 1])) * rbs;
        b_sum += (stack.b = (pb = pixels[yi + 2])) * rbs;
        a_sum += (stack.a = (pa = pixels[yi + 3])) * rbs;

        r_in_sum += pr;
        g_in_sum += pg;
        b_in_sum += pb;
        a_in_sum += pa;

        stack = stack.next;

        if (i < heightMinus1) {
            yp += width;
        }
        }

        yi = x;
        stackIn = stackStart;
        stackOut = stackEnd;
        for (y = 0; y < height; y++) {
        p = yi << 2;
        pixels[p + 3] = pa = (a_sum * mul_sum) >> shg_sum;
        if (pa > 0) {
            pa = 255 / pa;
            pixels[p] = ((r_sum * mul_sum) >> shg_sum) * pa;
            pixels[p + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
            pixels[p + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
        } else {
            pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
        }

        r_sum -= r_out_sum;
        g_sum -= g_out_sum;
        b_sum -= b_out_sum;
        a_sum -= a_out_sum;

        r_out_sum -= stackIn.r;
        g_out_sum -= stackIn.g;
        b_out_sum -= stackIn.b;
        a_out_sum -= stackIn.a;

        p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p: heightMinus1) * width)) << 2;

        r_sum += (r_in_sum += (stackIn.r = pixels[p]));
        g_sum += (g_in_sum += (stackIn.g = pixels[p + 1]));
        b_sum += (b_in_sum += (stackIn.b = pixels[p + 2]));
        a_sum += (a_in_sum += (stackIn.a = pixels[p + 3]));

        stackIn = stackIn.next;

        r_out_sum += (pr = stackOut.r);
        g_out_sum += (pg = stackOut.g);
        b_out_sum += (pb = stackOut.b);
        a_out_sum += (pa = stackOut.a);

        r_in_sum -= pr;
        g_in_sum -= pg;
        b_in_sum -= pb;
        a_in_sum -= pa;

        stackOut = stackOut.next;

        yi += width;
        }
    }

    return imageData
}

function BlurStack() {
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.a = 0;
    this.next = null;
}

module.exports = getImagePos
