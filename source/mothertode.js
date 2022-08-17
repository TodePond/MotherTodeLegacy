{
	const scope = {}
	MotherTode.scope = scope
	MotherTode.install = () => {
		const Term = MotherTode.Term
	
		scope.MotherTode = Term.args(
			Term.emit(
				Term.list([
					Term.term("GroupInner", scope),
					Term.eof,
				]),
				([{output}]) => {
					const lines = []
					lines.push(`const scope = {isScope: true}`)
					lines.push(`const term = ${output}`)
					lines.push(`scope.term = term`)
					lines.push("return term")
					return lines.join("\n")
				},
			),
			() => ({exceptions: [], indentSize: 0, scopePath: ""}),
		)
		
		scope.Term = Term.or([
			Term.term("Except", scope),
			Term.term("Or", scope),
			Term.term("Maybe", scope),
			Term.term("Many", scope),
			Term.term("Any", scope),
			
			Term.term("HorizontalDefinition", scope),
			Term.term("HorizontalList", scope),
			
			Term.term("EOFReference", scope),
			Term.term("Reference", scope),
			Term.term("GapReference", scope),
			
			Term.term("Group", scope),
			Term.term("MaybeGroup", scope),
			Term.term("AnyGroup", scope),
			Term.term("OrGroup", scope),
			Term.term("String", scope),
			Term.term("RegExp", scope),
			//Term.term("NoExceptions", scope),
		])
		
		scope.GapReference = Term.emit(
			Term.string("_"),
			"Term.logString(Term.many(Term.regExp(/ |	/)), () => '_')",
		)
		
		scope.EOFReference = Term.emit(
			Term.string("EOF"),
			"Term.eof",
		)
		
		scope.Reference = Term.emit(
			Term.list([
				Term.term("Name", scope),
				Term.maybe(
					Term.many(
						Term.list([
							Term.string("."),
							Term.term("Name", scope),
						])
					)
				),
			]),
			(name) => {
				const str = `Term.term('${name.args.scopePath}${name}', scope)`
				//console.log(str)
				return str
			}
		)
		
		const makeDefinition = (options = {}, indentSize) => {
			const {
				match = `Term.string('')`,
				emit,
				check,
				error,
				chain,
				args,
				subTerm,
				exp,
			} = options
			
			let definition = match
			if (check !== undefined) {
				definition = `Term.check(${definition}, ${check})`
			}
			if (error !== undefined) {
				definition = `Term.error(${definition}, ${error})`
			}
			if (args !== undefined) {
				definition = `Term.args(${definition}, ${args})`
			}
			if (chain !== undefined) {
				definition = `Term.chain(${chain}, ${definition})`
			}
			if (emit !== undefined) {
				definition = `Term.emit(${definition}, ${emit})`
			}
			if (subTerm !== undefined) {
				const subTermsCode = subTerm.map(([name, value]) => `['${name}', ${value}]`).join(`, `)
				definition = `Term.subTerms(${definition}, [${subTermsCode}])`
			}
			if (exp !== undefined) {
				definition = `Term.export(${definition}, window, "${exp[0]}")`
			}
			return definition
		}
		
		const PROPERTY_NAMES = [
			"match",
			"emit",
			"check",
			"error",
			"chain",
			"args",
			"subTerm",
			"exp",
		]
		
		scope.HorizontalDefinition = Term.emit(
			Term.list([
				Term.term("DefinitionProperty", scope),
				Term.maybe(
					Term.many(
						Term.list([
							Term.term("Gap", scope),
							Term.term("DefinitionProperty", scope),
						])
					)
				),
			]),
			(result) => {
				const entries = new Function(`return [${result}]`)()
				const options = {}
				for (const property of entries) {
					for (const propertyName of PROPERTY_NAMES) {
						const propertyValue = property[propertyName]
						if (propertyValue !== undefined) {
							if (propertyName == "subTerm") {
								if (options.subTerm === undefined) options.subTerm = []
								options.subTerm.push(propertyValue)
								continue
							}
							if (options[propertyName] !== undefined) {
								result.success = false
								return
							}
							options[propertyName] = propertyValue
						}
					}
				}
				
				const definition = makeDefinition(options, result.args.indentSize)
				return definition
				
			}
		)
		
		scope.DefinitionEntry = Term.or([
			Term.term("Export", scope),
			Term.term("DefinitionProperty", scope),
			Term.term("Declaration", scope),
		])
		
		scope.Name = Term.many(Term.regExp(/[a-zA-Z_$]/))
		
		scope.Declaration = Term.emit(
			Term.args(
				Term.list([
					Term.term("Name", scope),
					Term.maybe(Term.term("Gap", scope)),
					Term.term("Term", scope),
				]),
				(args, input) => {
					const nameResult = scope.Name(input)
					if (!nameResult.success) return args
					const name = nameResult.output
					args.scopePath += name + "."
					//args.d
					return args
				}
			),
			([name, gap, term]) => {
				return `{subTerm: [\`${name}\`, \`${sanitise(term.output)}\`]},`
			}
		)
		
		scope.Export = Term.emit(
			Term.list([
				Term.string("export"),
				Term.maybe(Term.term("Gap", scope)),
				Term.string("as"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("Reference", scope),
			]),
			([exp, gap1, as, gap2, term]) => {
				const name = term.output.split("'")[1]
				return `{exp: ["${name}", "${term}"]},`
			}
		)
		
		scope.VerticalDefinition = Term.emit(
			Term.list([
				Term.term("DefinitionEntry", scope),
				Term.maybe(
					Term.many(
						Term.list([
							Term.term("NewLine", scope),
							Term.term("DefinitionEntry", scope),
						])
					)
				),
			]),
			(result) => {
				const entries = new Function(`return [${result}]`)()
				const options = {}
				for (const property of entries) {
					for (const propertyName of PROPERTY_NAMES) {
						const propertyValue = property[propertyName]
						if (propertyValue !== undefined) {
							if (propertyName == "subTerm") {
								if (options.subTerm === undefined) options.subTerm = []
								options.subTerm.push(propertyValue)
								continue
							}
							if (options[propertyName] !== undefined) {
								result.success = false
								return
							}
							options[propertyName] = propertyValue
						}
					}
				}
				
				const definition = makeDefinition(options, result.args.indentSize)
				return definition
			},
		)
		
		scope.DefinitionProperty = Term.or([
			Term.term("MatchProperty", scope),
			Term.term("EmitProperty", scope),
			Term.term("CheckProperty", scope),
			Term.term("ErrorProperty", scope),
			Term.term("ArgsProperty", scope),
			Term.term("ChainProperty", scope),
		])
		
		const sanitise = (string) => string.split("`").join("\\`")
		
		scope.MatchProperty = Term.emit(
			Term.list([
				Term.string("::"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("Term", scope),
			]),
			([operator, gap, term = {}]) => `{match: \`${sanitise(term.output)}\`}, `,
		)
		
		scope.ChainProperty = Term.emit(
			Term.list([
				Term.string("++"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("Term", scope),
			]),
			([operator, gap, term = {}]) => `{chain: \`${sanitise(term.output)}\`}, `,
		)
		
		scope.EmitProperty = Term.emit(
			Term.list([
				Term.string(">>"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("JavaScript", scope),
			]),
			([operator, gap, term = {}]) => `{emit: \`${sanitise(term.output)}\`},`,
		)
		
		scope.CheckProperty = Term.emit(
			Term.list([
				Term.string("??"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("JavaScript", scope),
			]),
			([operator, gap, term = {}]) => `{check: \`${sanitise(term.output)}\`},`,
		)
		
		scope.ErrorProperty = Term.emit(
			Term.list([
				Term.string("!!"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("JavaScript", scope),
			]),
			([operator, gap, term = {}]) => `{error: \`${sanitise(term.output)}\`},`,
		)
		
		scope.ArgsProperty = Term.emit(
			Term.list([
				Term.string("@@"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("JavaScript", scope),
			]),
			([operator, gap, term = {}]) => `{args: \`${sanitise(term.output)}\`},`,
		)
		
		scope.JavaScript = Term.emit(
			Term.or([
				Term.term("JavaScriptMultiple", scope),
				Term.term("JavaScriptSingle", scope),
			]),
			({output}) => {
				const state = {
					escape: false,
					output: "",
				}
				for (let i = 0; i < output.length; i++) {
					const c = output[i]
					if (state.escape) {
						state.output += c
						state.escape = false
					}
					else if (c === "\\" && output[i+1] === "n") state.output += "\\\\\\\\"
					else if (c === "\\") state.escape = true
					//else if (c === "'") state.output += "`"
					//else if (c === "#") state.output += "\\$"
					else state.output += c
				}
				return state.output
			}
		)
		
		scope.JavaScriptSingle = Term.term("Line", scope)
		scope.JavaScriptMultiple = Term.list([
			Term.term("Line", scope),
			Term.args(
				Term.term("JavaScriptMultipleInner", scope),
				(args) => {
					args.indentSize++
					return args
				}
			),
			Term.term("Line", scope),
		])
		
		scope.JavaScriptMultipleInner = Term.list([
			Term.term("NewLine", scope),
			Term.term("JavaScriptLines", scope),
			Term.term("Unindent", scope),
		])
		
		scope.JavaScriptLines = Term.list([
			Term.term("Line", scope),
			Term.maybe(
				Term.many(
					Term.list([
						Term.term("NewLine", scope),
						Term.term("Line", scope),
					])
				)
			)
		])
		
		scope.Line = Term.list([
			Term.many(Term.regExp(/[^\n]/)),
		])
		
		scope.Many = Term.emit(
			Term.list([
				Term.except(Term.term("Term", scope), [Term.term("Many", scope)]),
				Term.maybe(Term.term("Gap", scope)),
				Term.check(
					Term.string("+"),
					(result) => result.tail[0] !== "+",
				),
			]),
			([term]) => `Term.many(${term})`,
		)
		
		scope.Except = Term.emit(
			Term.list([
				Term.except(Term.term("Term", scope), [Term.term("Except", scope)]),
				Term.maybe(Term.term("Gap", scope)),
				Term.string("~"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("Term", scope),
			]),
			([left, gap1, operator, gap2, right]) => `Term.except(${left}, [${right}])`,
		)
		
		scope.NoExceptions = Term.emit(
			Term.list([
				Term.string("any"),
				Term.maybe(Term.term("Gap", scope)),
				Term.term("Term", scope),
			]),
			([keyword, gap, term]) => `Term.any(${term})`,
		)
		
		scope.Or = Term.emit(
			Term.list([
				Term.except(Term.term("Term", scope), [Term.term("Or", scope)]),
				Term.term("OrTails", scope),
			]),
			([head, tail = []]) => `Term.or([${head},\n${tail}])`,
		)
		
		scope.OrTail = Term.emit(
			Term.list([
				Term.maybe(Term.term("Gap", scope)),
				Term.string("|"),
				Term.maybe(Term.term("Gap", scope)),
				Term.except(Term.term("Term", scope), [Term.term("Or", scope)]),
			]),
			([gap1, operator, gap2, term]) => `${term}`,
		)
		
		scope.OrTails = Term.emit(
			Term.many(Term.term("OrTail", scope)),
			(tails) => tails.filter(t => t.success).map(t => t.output).join(`,\n`),
		)
		
		scope.Maybe = Term.emit(
			Term.list([
				Term.except(Term.term("Term", scope), [Term.term("Maybe", scope)]),
				Term.maybe(Term.term("Gap", scope)),
				Term.check(
					Term.string("?"),
					(result) => result.tail[0] !== "?" //
				),
			]),
			([term]) => `Term.maybe(${term})`,
		)
		
		scope.Any = Term.emit(
			Term.list([
				Term.except(Term.term("Term", scope), [Term.term("Any", scope)]),
				Term.maybe(Term.term("Gap", scope)),
				Term.string("*"),
			]),
			([term]) => `Term.maybe(Term.many(${term}))`,
		)
		
		scope.MaybeGroup = Term.emit(
			Term.list([
				Term.string("["),
				Term.term("GroupInner", scope),
				Term.string("]"),
			]),
			([left, inner]) => `Term.maybe(${inner})`,
		)
		
		scope.AnyGroup = Term.emit(
			Term.list([
				Term.string("{"),
				Term.term("GroupInner", scope),
				Term.string("}"),
			]),
			([left, inner]) => `Term.maybe(Term.many(${inner}))`,
		)
		
		scope.OrGroup = Term.emit(
			Term.list([
				Term.string("<"),
				Term.term("ArrayInner", scope),
				Term.string(">"),
			]),
			([left, inner]) => `Term.or([${inner}])`,
		)
		
		scope.Group = Term.emit(
			Term.list([
				Term.string("("),
				Term.term("GroupInner", scope),
				Term.string(")"),
			]),
			([left, inner]) => `${inner}`,
		)
		
		scope.ArrayInner = Term.or([
			Term.term("HorizontalArrayInner", scope),
			Term.emit(
				Term.args(
					Term.term("VerticalArrayInner", scope),
					(args) => {
						args.indentSize++
						return args
					}
				),
				(array) => `${array}`
			)
		])
		
		scope.GroupInner = Term.or([
			Term.term("HorizontalGroupInner", scope),
			Term.args(
				Term.term("VerticalGroupInner", scope),
				(args) => {
					args.indentSize++
					return args
				}
			)
		])
		
		scope.HorizontalArrayInner = Term.emit(
			Term.list([
				Term.maybe(Term.term("Gap", scope)),
				Term.or([
					Term.except(Term.term("HorizontalArray", scope), [Term.term("HorizontalList", scope)]),
					Term.except(Term.term("Term", scope), []),
				]),
				Term.maybe(Term.term("Gap", scope)),
			]),
			([left, inner]) => `${inner}`,
		)
		
		scope.VerticalArrayInner = Term.emit(
			Term.list([
				Term.term("NewLine", scope),
				Term.or([
					Term.term("VerticalArray", scope),
					Term.term("Term", scope),
				]),
				Term.term("Unindent", scope),
			]),
			([left, inner]) => `${inner}`,
		)
		
		scope.HorizontalGroupInner = Term.emit(
			Term.list([
				Term.maybe(Term.term("Gap", scope)),
				Term.or([
					Term.term("HorizontalDefinition", scope),
					Term.term("Term", scope),
				]),
				Term.maybe(Term.term("Gap", scope)),
			]),
			([left, inner]) => `${inner}`,
		)
		
		scope.VerticalGroupInner = Term.emit(
			Term.list([
				Term.term("NewLine", scope),
				Term.or([
					Term.term("VerticalDefinition", scope),
					Term.term("VerticalList", scope),
					Term.term("Term", scope),
				]),
				Term.term("Unindent", scope),
			]),
			([left, inner]) => `${inner}`,
		)
		
		const getMargin = (size) => Array(size).fill(`	`).join("")
		scope.Margin = Term.check(
			Term.maybe(Term.term("Gap", scope)),
			(gap) => {
				const indentSize = gap.args.indentSize === undefined? 0 : gap.args.indentSize
				return `${gap}`.length === indentSize
			},
		)
		
		scope.NewLine = Term.list([
			Term.many(
				Term.list([
					Term.maybe(Term.term("Gap", scope)),
					Term.string("\n"),
				])
			),
			Term.term("Margin", scope),
		])
		
		scope.Unindent = Term.list([
			Term.many(
				Term.list([
					Term.maybe(Term.term("Gap", scope)),
					Term.string("\n"),
				])
			),
			Term.args(
				Term.term("Margin", scope),
				(args) => {
					args.indentSize--
					return args
				}
			)
		])
		
		scope.String = Term.emit(
			Term.list([
				Term.string(`"`),
				Term.maybe(
					Term.many(
						Term.regExp(/[^"]/) //"
					)
				),
				Term.string(`"`),
			]),
			([left, inner]) => `Term.string(\`${inner}\`)`
		)
		
		scope.RegExp = Term.emit(
			Term.list([
				Term.string(`/`),
				Term.maybe(
					Term.many(
						Term.regExp(/[^/]/)
					)
				),
				Term.string(`/`),
			]),
			([left, inner]) => {
				const source = inner.output.split("").map(c => {
					/*if (c === "\\") return "\\\\\\"*/
					return c
				}).join("")
				return `Term.regExp(\`${inner}\`)`
			},
		)
		
		scope.VerticalList = Term.emit(
			Term.term("VerticalArray", scope),
			(array) => `Term.list([${array}])`,
		)
		
		scope.VerticalArray = Term.emit(
			Term.list([
				Term.term("Term", scope),
				Term.many(
					Term.list([
						Term.maybe(Term.term("NewLine", scope)),
						Term.term("Term", scope),
					])
				),
			]),
			([head, tail = []]) => {
				const tails = tail.filter(t => t.success).map(t => t[1])
				return `${head},\n${tails.join(",\n")}`
			},
		)
		
		scope.HorizontalList = Term.emit(
			Term.except(
				Term.term("HorizontalArray", scope),
				[Term.term("HorizontalList", scope), Term.term("HorizontalDefinition", scope)]
			),
			(array) => `Term.list([${array}])`,
		)
		
		scope.HorizontalArray = Term.emit(
			Term.list([
				Term.term("Term", scope),
				Term.many(
					Term.list([
						Term.maybe(Term.term("Gap", scope)),
						Term.term("Term", scope),
					])
				),
			]),
			([head, tail = []]) => {
				const tails = tail.filter(t => t.success).map(t => t[1])
				return `${head},\n${tails.join(",\n")}`
			},
		)
		
		scope.Gap = Term.many(Term.regExp(/[ 	]/))
	}
	
}