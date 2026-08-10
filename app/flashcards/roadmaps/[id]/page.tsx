import { RoadmapPlayer } from "./RoadmapPlayer";
export default async function RoadmapPage({params}:{params:Promise<{id:string}>}){return <RoadmapPlayer courseId={(await params).id}/>}
