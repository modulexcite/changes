import uuid

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship, backref
from sqlalchemy.schema import UniqueConstraint

from changes.config import db
from changes.constants import Status, Result
from changes.db.types.enum import Enum
from changes.db.types.guid import GUID


class JobPhase(db.Model):
    """A JobPhase is a grouping of one or more JobSteps performing the same basic task.
    The phases of a Job are intended to be executed sequentially, though that isn't necesarily
    enforced.

    One example of phase usage: a Job may have a test collection phase and a test execution phase,
    with a single JobStep collecting tests in the first phase and an arbitrary number
    of JobSteps executing shards of the collected tests in the second phase.
    By using two phases, the types of JobSteps can be tracked and managed independently.

    Though JobPhases are typically created to group newly created JobSteps, they
    can also be constructed retroactively once a JobStep has finished based on
    phased artifacts. This is convenient but a little confusing, and perhaps
    should be handled by another mechanism.
    """
    # TODO(dcramer): add order column rather than implicity date_started ordering
    # TODO(dcramer): make duration a column
    __tablename__ = 'jobphase'
    __table_args__ = (
        UniqueConstraint('job_id', 'label', name='unq_jobphase_key'),
    )

    id = Column(GUID, nullable=False, primary_key=True, default=uuid.uuid4)
    job_id = Column(GUID, ForeignKey('job.id', ondelete="CASCADE"), nullable=False)
    project_id = Column(GUID, ForeignKey('project.id', ondelete="CASCADE"), nullable=False)
    label = Column(String(128), nullable=False)
    status = Column(Enum(Status), nullable=False, default=Status.unknown)
    result = Column(Enum(Result), nullable=False, default=Result.unknown)
    date_started = Column(DateTime)
    date_finished = Column(DateTime)
    date_created = Column(DateTime, default=datetime.utcnow)

    job = relationship('Job', backref=backref('phases', order_by='JobPhase.date_started'))
    project = relationship('Project')

    def __init__(self, **kwargs):
        super(JobPhase, self).__init__(**kwargs)
        if self.id is None:
            self.id = uuid.uuid4()
        if self.result is None:
            self.result = Result.unknown
        if self.status is None:
            self.status = Status.unknown
        if self.date_created is None:
            self.date_created = datetime.utcnow()

    @property
    def duration(self):
        """
        Return the duration (in milliseconds) that this item was in-progress.
        """
        if self.date_started and self.date_finished:
            duration = (self.date_finished - self.date_started).total_seconds() * 1000
        else:
            duration = None
        return duration
