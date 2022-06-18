
// The file policy.script looks like:
// {
// 	"type": "all",
// 	"scripts":
// 	[
// 		{
// 			"type": "before",
// 			"slot": <insert slot here>
// 		},
// 		{
// 			"type": "sig",
// 			"keyHash": "insert keyHash here"
// 		}
// 	]
// }
export default interface PolicyScriptResult {
	slot: number|undefined;
	keyHash: string|undefined;
}
