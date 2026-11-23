import { relative } from "node:path"

export default {
  "*": (files) => {
    const paths = files.map((file) => relative(process.cwd(), file)).join(",")
    return `pnpm exec nx format:write --files="${paths}"`
  }
}
