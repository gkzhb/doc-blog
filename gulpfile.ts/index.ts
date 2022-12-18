import fs from "fs";
import { exec } from "child_process";
import through2 from "through2";
import { src, watch, series, parallel } from "gulp";
import orgToMarkDown from "org-to-markdown";

interface IVinyl {
  path: string;
  contents: string;
}

/** transform org file to mdx */
async function transpile(file: IVinyl) {
  const result = await orgToMarkDown(file.contents);
  const newPath = file.path.replace(/\.org$/, ".mdx");
  // body omitted
  fs.writeFile(newPath, result, { encoding: "utf-8" }, () => {});
}

const unlink = through2.obj((file: IVinyl, enc: string, cb: Function) => {
  removeMdx(file.path, cb);
});

function removeMdx(path: string, cb?: Function) {
  if (fs.existsSync(path)) {
    fs.unlink(path, (err) => {
      if (err) {
        throw err;
      }
      console.log("Removed file:", path);
      cb?.();
    });
  }
}

/** transform all org files */
function build() {
  return src("blog/**.org").pipe(
    through2.obj((file, enc, cb) => {
      transpile(file);
      cb();
    })
  );
}

function watchDoc() {
  return exec("npm run start");
}

async function handleOrgChange(ev: string, path: string) {
  switch (ev) {
    case "add":
    case "change":
      console.log("Updated file:", path);
      fs.readFile(path, { encoding: "utf-8" }, (err, data) => {
        if (err) {
          throw err;
        }
        transpile({ path, contents: data });
      });
      break;
    case "unlink":
      // org file deleted
      removeMdx(path);
  }
}

function watchOrg() {
  const result = watch(
    "blog/**.org",
    { ignoreInitial: false, delay: 500 },
    (cb) => {
      cb();
    }
  );
  result.on("all", handleOrgChange);
  return result;
}

function cleanMdx() {
  return src("blog/**.mdx").pipe(unlink);
}

exports.build = build;
exports.start = parallel(watchOrg, watchDoc);
exports.clean = cleanMdx;
exports.default = build;
