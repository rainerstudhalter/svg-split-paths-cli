#!/usr/bin/env node
'use strict'

import { program } from 'commander';
import fs from "fs";
import path from "path";
import isSvg from 'is-svg';
import { parse } from 'svgson';
import { pathThatSvg } from 'path-that-svg';

// with the import statement we already have a svg root element, we dont have to create a new one by svg()
import svg from 'svg-builder';

const getPaths = (node) => {
    let paths = []
    if (node.name == 'path') {
        let d = node.attributes.d.replaceAll('\n', ' ');
        // split geometry by 'M', filter out empty (the first one is always empty) and put an 'M' before every splitted string
        // and finally push the splitted string to paths array
        paths.push(...d.split('M').filter((dSplit) => dSplit.length > 0).map(dSplit => 'M' + dSplit));
    } else if (node.children && Array.isArray(node.children)) {
        // process the paths children recursively
        paths.push(...node.children.map(getPaths));
    }
    return paths;
}

program
    .description('Convert an entire svg to path elements, split combined absolute paths into seperate paths, and save them to a new svg file')
    .argument('<input file>', 'path to input file')
    .requiredOption('-o, --output <path>', 'path to output file')
    .action(async (inputFile, options) => {
        const file = fs.readFileSync(inputFile);
        const fileData = file.toString();
        if (!isSvg(fileData)) {
            throw 'Invalid SVG'
        }
        
        // convert all elements to paths
        const pathedSVG = await parse(await pathThatSvg(fileData));

        // get an array of paths
        const SVGPaths = getPaths(pathedSVG).flat(Infinity);
        
        svg.width(pathedSVG.attributes.width).height(pathedSVG.attributes.height);
        for (const d of SVGPaths) {
            svg.path({d: d});
        }
        fs.writeFileSync(options.output, svg.render());
    });

program.parse();