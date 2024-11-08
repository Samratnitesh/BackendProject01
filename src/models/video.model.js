import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({
    videoFile: {
        type: String, // We will be getting this from the cloudnary url
        required: true
    },
    thumbnail: {
        type: String, // cloudnary url se
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number, // from cloudnary url
        required: true
    },
    views: {
        type:Number,
        default: t0
    },
    isPublished: {
        type: Boolean,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: User
    }
},
{timestamps: true});

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);